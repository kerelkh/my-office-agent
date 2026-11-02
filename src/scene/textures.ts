import * as THREE from 'three';
import { css } from '../colors';

/** Tekstur prosedural lewat kanvas: tidak ada berkas gambar yang perlu diunduh. Warna diambil dari token --scene-*. */
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bases = new Map<string, THREE.CanvasTexture>();
const clones = new Map<string, THREE.Texture>();

function base(key: string, w: number, h: number, draw: Draw, srgb = true) {
  let t = bases.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d')!, w, h);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    bases.set(key, t);
  }
  return t;
}

/** Salinan dengan pengulangan sendiri, berbagi gambar yang sama. */
function sized(key: string, t: THREE.CanvasTexture, rx: number, ry: number) {
  const k = `${key}:${rx.toFixed(2)}:${ry.toFixed(2)}`;
  let c = clones.get(k);
  if (!c) { c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; clones.set(k, c); }
  return c;
}

const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    g.fillRect(r() * w, r() * h, 2, 2);
  }
};

/* ---------- lantai ---------- */
const carpet: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-carpet'); g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
  speckle(g, w, h, 12000, 0.05, 11);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
};

const parquet: Draw = (g, w, h) => {
  const r = rng(5), rows = 12, ph = h / rows;
  g.fillStyle = css('--scene-wood'); g.fillRect(0, 0, w, h);
  for (let i = 0; i < rows; i++) {
    let x = -r() * 120;
    while (x < w) {
      const len = 110 + r() * 150;
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.02 + r() * 0.1})` : `rgba(0,0,0,${0.02 + r() * 0.12})`;
      g.fillRect(x, i * ph, len, ph);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.strokeRect(x, i * ph, len, ph);
      g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const y = i * ph + 4 + r() * (ph - 8); g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + len - 4, y + (r() - 0.5) * 3); g.stroke(); }
      x += len;
    }
  }
};

const tile: Draw = (g, w, h) => {
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? css('--scene-tile-b') : css('--scene-tile-a');
    g.fillRect(i * s, j * s, s, s);
  }
  speckle(g, w, h, 3000, 0.03, 3);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
};

const concrete: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-concrete'); g.fillRect(0, 0, w, h);
  speckle(g, w, h, 16000, 0.04, 21);
  const r = rng(8);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
};

const marble: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-marble'); g.fillRect(0, 0, w, h);
  const r = rng(13);
  g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(90,100,120,${0.05 + r() * 0.12})`; g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 120; y += (r() - 0.5) * 120; g.quadraticCurveTo(x - 30, y + 30, x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
};

/* ---------- dinding dan kayu ---------- */
const wall: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-wall'); g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, 0.025, 4);
  const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, 'rgba(255,255,255,0.05)'); grad.addColorStop(1, 'rgba(0,0,0,0.06)');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
};

const wallAccent: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-wall-2'); g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, 0.03, 6);
};

const wood: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-wood'); g.fillRect(0, 0, w, h);
  const r = rng(17);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = r() < 0.5 ? `rgba(0,0,0,${0.04 + r() * 0.1})` : `rgba(255,255,255,${0.03 + r() * 0.07})`;
    g.lineWidth = 0.8 + r() * 2; const y = r() * h;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 14, w * 0.7, y + (r() - 0.5) * 14, w, y + (r() - 0.5) * 8); g.stroke();
  }
};

const bump: Draw = (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  const r = rng(29);
  for (let i = 0; i < 14000; i++) { const v = 90 + r() * 90; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 2, 2); }
};

/* ---------- layar, jendela, dekorasi ---------- */
const code: Draw = (g, w, h) => {
  g.fillStyle = css('--color-paper-3'); g.fillRect(0, 0, w, h);
  const cols = [css('--color-accent'), css('--color-cool'), css('--color-ok'), css('--color-ink-2'), css('--color-muted')];
  const r = rng(41);
  let y = 10;
  while (y < h - 8) {
    const indent = Math.floor(r() * 4) * 16 + 10;
    let x = indent;
    const parts = 1 + Math.floor(r() * 4);
    for (let p = 0; p < parts; p++) {
      const len = 14 + r() * 60;
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.globalAlpha = 0.85;
      g.fillRect(x, y, len, 6); x += len + 6;
      if (x > w - 24) break;
    }
    g.globalAlpha = 1;
    y += r() < 0.15 ? 22 : 12;
  }
};

const sky: Draw = (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, css('--scene-sky-top')); grad.addColorStop(1, css('--scene-sky-bottom'));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  const r = rng(53);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 7; i++) { const x = r() * w, y = 20 + r() * h * 0.4; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 26, y + (k % 2) * 6, 34, 14, 0, 0, 7); g.fill(); } }
  g.fillStyle = css('--scene-skyline');
  let x = 0;
  while (x < w) { const bw = 24 + r() * 40, bh = 30 + r() * 70; g.fillRect(x, h - bh, bw, bh); x += bw + 3; }
};

const POSTERS: Draw[] = [
  (g, w, h) => { g.fillStyle = css('--scene-trim'); g.fillRect(0, 0, w, h); g.fillStyle = css('--scene-wall-2'); g.beginPath(); g.arc(w * 0.5, h * 0.42, w * 0.28, 0, 7); g.fill(); g.fillStyle = css('--scene-fabric-2'); g.fillRect(w * 0.18, h * 0.74, w * 0.64, h * 0.07); },
  (g, w, h) => { g.fillStyle = css('--scene-wood-dark'); g.fillRect(0, 0, w, h); const c = [css('--scene-trim'), css('--scene-fabric-3'), css('--scene-fabric-2')]; for (let i = 0; i < 5; i++) { g.fillStyle = c[i % 3]; g.fillRect(w * (0.1 + i * 0.16), h * (0.2 + (i % 2) * 0.2), w * 0.12, h * (0.5 - (i % 2) * 0.1)); } },
  (g, w, h) => { g.fillStyle = css('--scene-trim'); g.fillRect(0, 0, w, h); g.strokeStyle = css('--scene-fabric-1'); g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, h * (0.15 + i * 0.14)); g.bezierCurveTo(w * 0.3, h * (0.0 + i * 0.14), w * 0.6, h * (0.4 + i * 0.1), w, h * (0.2 + i * 0.13)); g.stroke(); } },
  (g, w, h) => { g.fillStyle = css('--scene-fabric-1'); g.fillRect(0, 0, w, h); g.fillStyle = css('--scene-trim'); g.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6); g.fillStyle = css('--scene-fabric-3'); g.fillRect(w * 0.32, h * 0.32, w * 0.36, h * 0.36); },
];

const whiteboard: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-white'); g.fillRect(0, 0, w, h);
  const r = rng(61);
  g.lineWidth = 4;
  const boxes = [[30, 40], [190, 40], [350, 40]];
  boxes.forEach(([x, y], i) => { g.strokeStyle = [css('--color-cool'), css('--color-accent'), css('--color-ok')][i]; g.strokeRect(x, y, 120, 60); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 14, y + 24, 70 + r() * 20, 6); });
  g.strokeStyle = css('--color-muted'); g.beginPath(); g.moveTo(150, 70); g.lineTo(190, 70); g.moveTo(310, 70); g.lineTo(350, 70); g.stroke();
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(40, 150 + i * 28, 120 + r() * 240, 6); }
  g.fillStyle = css('--scene-lamp'); g.fillRect(400, 170, 70, 70); g.fillStyle = css('--scene-fabric-2'); g.fillRect(400, 260, 70, 70);
};

const rug: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-fabric-1'); g.fillRect(0, 0, w, h);
  g.strokeStyle = css('--scene-trim'); g.lineWidth = 8; g.strokeRect(24, 24, w - 48, h - 48);
  g.strokeStyle = css('--scene-fabric-2'); g.lineWidth = 4; g.strokeRect(46, 46, w - 92, h - 92);
  g.fillStyle = css('--scene-fabric-3'); g.globalAlpha = 0.7;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(w / 2 + (i - 3.5) * 40, h * 0.3); g.lineTo(w / 2 + (i - 3.5) * 40 + 20, h * 0.5); g.lineTo(w / 2 + (i - 3.5) * 40, h * 0.7); g.lineTo(w / 2 + (i - 3.5) * 40 - 20, h * 0.5); g.fill(); }
  g.globalAlpha = 1;
  speckle(g, w, h, 6000, 0.05, 9);
};

/* ---------- lobi, luar ruangan ---------- */
const hall: Draw = (g, w, h) => {
  const n = 4, s = w / n, r = rng(71);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? css('--scene-hall') : css('--scene-hall-2');
    g.fillRect(i * s, j * s, s, s);
    g.fillStyle = `rgba(255,255,255,${r() * 0.06})`; g.fillRect(i * s, j * s, s, s);
  }
  speckle(g, w, h, 4000, 0.025, 31);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 2;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
};

const grass: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-grass'); g.fillRect(0, 0, w, h);
  const r = rng(83);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? css('--scene-grass-2') : 'rgba(255,255,255,0.05)'; g.globalAlpha = 0.25 + r() * 0.3; g.beginPath(); g.ellipse(r() * w, r() * h, 12 + r() * 40, 8 + r() * 24, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  speckle(g, w, h, 14000, 0.05, 37);
};

const asphalt: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-asphalt'); g.fillRect(0, 0, w, h);
  speckle(g, w, h, 20000, 0.05, 43);
};

const paving: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-paving'); g.fillRect(0, 0, w, h);
  const r = rng(91), rows = 8, ph = h / rows;
  for (let i = 0; i < rows; i++) {
    let x = (i % 2) * 32;
    while (x < w) { g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.07})`; g.fillRect(x, i * ph, 64, ph); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(x, i * ph, 64, ph); x += 64; }
  }
};

const theater: Draw = (g, w, h) => {
  g.fillStyle = css('--scene-curtain'); g.fillRect(0, 0, w, h);
  speckle(g, w, h, 14000, 0.06, 53);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
};

/** Tekstur berulang per satuan dunia. `per` = lebar satu ulangan dalam satuan scene. */
export const tex = {
  hall: (w: number, d: number) => sized('hall', base('hall', 512, 512, hall), w / 4, d / 4),
  grass: (w: number, d: number) => sized('grass', base('grass', 512, 512, grass), w / 8, d / 8),
  asphalt: (w: number, d: number) => sized('asphalt', base('asphalt', 512, 512, asphalt), w / 6, d / 6),
  paving: (w: number, d: number) => sized('paving', base('paving', 512, 512, paving), w / 3, d / 3),
  theater: (w: number, d: number) => sized('theater', base('theater', 512, 512, theater), w / 2, d / 2),
  carpet: (w: number, d: number) => sized('carpet', base('carpet', 512, 512, carpet), w / 2, d / 2),
  parquet: (w: number, d: number) => sized('parquet', base('parquet', 512, 512, parquet), w / 2.4, d / 2.4),
  tile: (w: number, d: number) => sized('tile', base('tile', 512, 512, tile), w / 2, d / 2),
  concrete: (w: number, d: number) => sized('concrete', base('concrete', 512, 512, concrete), w / 3, d / 3),
  marble: (w: number, d: number) => sized('marble', base('marble', 512, 512, marble), w / 3, d / 3),
  wall: (w: number, h: number) => sized('wall', base('wall', 256, 256, wall), w / 3, h / 3),
  wallAccent: (w: number, h: number) => sized('wallAccent', base('wallAccent', 256, 256, wallAccent), w / 3, h / 3),
  wood: (w: number, d: number) => sized('wood', base('wood', 256, 256, wood), w / 2, d / 2),
  bump: (w: number, d: number) => sized('bump', base('bump', 256, 256, bump, false), w / 1.5, d / 1.5),
  sky: () => base('sky', 512, 256, sky),
  rug: () => base('rug', 512, 512, rug),
  whiteboard: () => base('whiteboard', 512, 400, whiteboard),
  poster: (i: number) => base(`poster${i % POSTERS.length}`, 240, 320, POSTERS[i % POSTERS.length]),
  /** Layar kode; salinan baru tiap meja supaya bisa digulir sendiri-sendiri. */
  screen: (key: string) => {
    const t = base('code', 256, 512, code).clone();
    t.repeat.set(1, 0.5); t.offset.set(0, Math.abs(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100) / 100); t.needsUpdate = true;
    return t;
  },
};

/** Papan nama (plakat pintu) bertulisan; tidak overlay HTML, jadi tidak menutupi pandangan. */
const labels = new Map<string, THREE.CanvasTexture>();
export function labelTex(text: string): THREE.CanvasTexture {
  let t = labels.get(text);
  if (!t) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = css('--scene-black'); g.fillRect(0, 0, 512, 128);
    g.strokeStyle = css('--scene-metal'); g.lineWidth = 6; g.strokeRect(5, 5, 502, 118);
    g.fillStyle = css('--scene-white'); g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 62; g.font = `600 ${size}px "Host Grotesk", system-ui, sans-serif`;
    while (g.measureText(text).width > 450 && size > 24) { size -= 4; g.font = `600 ${size}px "Host Grotesk", system-ui, sans-serif`; }
    g.fillText(text, 256, 68);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    labels.set(text, t);
  }
  return t;
}
