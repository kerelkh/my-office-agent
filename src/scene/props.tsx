import * as THREE from 'three';
import { col } from '../colors';
import { tex } from './textures';

export type V3 = [number, number, number];

/* ---------- bahan ---------- */
interface MO { rough?: number; metal?: number; map?: THREE.Texture; bump?: THREE.Texture; bumpScale?: number; emissive?: string; ei?: number; opacity?: number }
const mats = new Map<string, THREE.MeshStandardMaterial>();

/** Bahan standar yang dibagikan antarmesh. `color` adalah token ("--scene-wall") atau warna CSS. */
export function mt(color: string, o: MO = {}) {
  const key = [color, o.rough, o.metal, o.map?.uuid, o.bump?.uuid, o.bumpScale, o.emissive, o.ei, o.opacity].join('|');
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: col(color), roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, map: o.map ?? null, bumpMap: o.bump ?? null, bumpScale: o.bumpScale ?? 1,
      emissive: o.emissive ? col(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1,
      transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1,
    });
    mats.set(key, m);
  }
  return m;
}
const T = (n: string, o: MO = {}) => mt(n, o);

/* ---------- primitif ---------- */
export function B({ s, p, m, r, shadow = true }: { s: V3; p: V3; m: THREE.Material; r?: V3; shadow?: boolean }) {
  return <mesh position={p} rotation={r} castShadow={shadow} receiveShadow><boxGeometry args={s} /><primitive object={m} attach="material" /></mesh>;
}
export function Cy({ r, rb, h, p, m, seg = 20, rot, shadow = true }: { r: number; rb?: number; h: number; p: V3; m: THREE.Material; seg?: number; rot?: V3; shadow?: boolean }) {
  return <mesh position={p} rotation={rot} castShadow={shadow} receiveShadow><cylinderGeometry args={[r, rb ?? r, h, seg]} /><primitive object={m} attach="material" /></mesh>;
}
export function Sp({ r, p, m, sy = 1 }: { r: number; p: V3; m: THREE.Material; sy?: number }) {
  return <mesh position={p} scale={[1, sy, 1]} castShadow receiveShadow><sphereGeometry args={[r, 14, 12]} /><primitive object={m} attach="material" /></mesh>;
}
/** Bidang bertekstur tanpa pencahayaan (layar, langit, kertas). */
export function Quad({ w, h, p, r, map, lit = false }: { w: number; h: number; p: V3; r?: V3; map: THREE.Texture; lit?: boolean }) {
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      {lit ? <meshStandardMaterial map={map} roughness={0.9} /> : <meshBasicMaterial map={map} toneMapped={false} />}
    </mesh>
  );
}

const rand = (seed: number) => { let a = seed; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; };

/* ---------- ruang kerja ---------- */
/** Kursi kantor. Kursi menghadap -z; sandarannya ada di sisi +z. */
export function OfficeChair({ p, rot = 0, fabric = '--scene-fabric-1' }: { p: V3; rot?: number; fabric?: string }) {
  const f = T(fabric, { rough: 0.95 }), dark = T('--scene-metal-dark', { rough: 0.5, metal: 0.4 });
  return (
    <group position={p} rotation-y={rot}>
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map(a => <B key={a} s={[0.85, 0.05, 0.1]} p={[0, 0.1, 0]} r={[0, a, 0]} m={dark} />)}
      <Cy r={0.05} h={0.35} p={[0, 0.28, 0]} m={dark} seg={10} />
      <B s={[0.82, 0.12, 0.8]} p={[0, 0.5, 0]} m={f} />
      <B s={[0.78, 0.82, 0.1]} p={[0, 0.96, 0.38]} m={f} />
      {[-0.44, 0.44].map(x => <group key={x}><B s={[0.08, 0.08, 0.5]} p={[x, 0.76, 0.02]} m={dark} /><B s={[0.06, 0.22, 0.06]} p={[x, 0.64, 0.15]} m={dark} /></group>)}
    </group>
  );
}

export function Mug({ p, c = '--scene-fabric-2' }: { p: V3; c?: string }) {
  return <group position={p}><Cy r={0.09} h={0.16} p={[0, 0.08, 0]} m={T(c, { rough: 0.5 })} seg={14} /><B s={[0.05, 0.1, 0.03]} p={[0.11, 0.08, 0]} m={T(c, { rough: 0.5 })} /></group>;
}

export function DeskLamp({ p, rot = 0 }: { p: V3; rot?: number }) {
  const dark = T('--scene-metal-dark', { rough: 0.4, metal: 0.5 });
  return (
    <group position={p} rotation-y={rot}>
      <Cy r={0.15} h={0.04} p={[0, 0.02, 0]} m={dark} seg={14} />
      <B s={[0.04, 0.5, 0.04]} p={[0, 0.27, 0]} m={dark} />
      <B s={[0.04, 0.04, 0.4]} p={[0, 0.52, 0.12]} m={dark} />
      <Cy r={0.13} rb={0.06} h={0.14} p={[0, 0.46, 0.32]} m={T('--scene-lamp', { emissive: '--scene-lamp', ei: 0.6 })} seg={12} rot={[0.4, 0, 0]} />
    </group>
  );
}

export function Papers({ p, rot = 0 }: { p: V3; rot?: number }) {
  const w = T('--scene-white', { rough: 0.95 });
  return <group position={p} rotation-y={rot}><B s={[0.5, 0.04, 0.65]} p={[0, 0.02, 0]} m={w} /><B s={[0.5, 0.02, 0.65]} p={[0.04, 0.05, 0.02]} r={[0, 0.12, 0]} m={T('--scene-trim')} /></group>;
}

export function Plant({ p, s = 1, seed = 1 }: { p: V3; s?: number; seed?: number }) {
  const leaf = T('--scene-plant', { rough: 0.9 }), leaf2 = T('--scene-plant-2', { rough: 0.9 }), pot = T('--scene-pot', { rough: 0.7 });
  const r = rand(seed * 7 + 3);
  const leaves = Array.from({ length: 7 }, (_, i) => ({ x: (r() - 0.5) * 0.6, y: 0.9 + r() * 0.9, z: (r() - 0.5) * 0.6, s: 0.28 + r() * 0.22, c: i % 2 }));
  return (
    <group position={p} scale={s}>
      <Cy r={0.34} rb={0.26} h={0.55} p={[0, 0.28, 0]} m={pot} />
      <Cy r={0.3} h={0.05} p={[0, 0.55, 0]} m={T('--scene-wood-dark')} />
      <Cy r={0.05} h={0.7} p={[0, 0.9, 0]} m={T('--scene-wood-dark')} seg={8} />
      {leaves.map((l, i) => <Sp key={i} r={l.s} p={[l.x, l.y, l.z]} m={l.c ? leaf2 : leaf} sy={0.85} />)}
    </group>
  );
}

export function Poster({ p, rot = 0, w = 1, h = 1.35, i = 0 }: { p: V3; rot?: number; w?: number; h?: number; i?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <B s={[w + 0.14, h + 0.14, 0.06]} p={[0, 0, 0]} m={T('--scene-wood-dark', { rough: 0.6 })} />
      <Quad w={w} h={h} p={[0, 0, 0.04]} map={tex.poster(i)} />
    </group>
  );
}

export function Whiteboard({ p, rot = 0, w = 2.4 }: { p: V3; rot?: number; w?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <B s={[w + 0.12, w * 0.62 + 0.12, 0.08]} p={[0, 0, 0]} m={T('--scene-metal', { rough: 0.4, metal: 0.5 })} />
      <Quad w={w} h={w * 0.62} p={[0, 0, 0.05]} map={tex.whiteboard()} lit />
      <B s={[w * 0.6, 0.06, 0.1]} p={[0, -w * 0.31 - 0.1, 0.05]} m={T('--scene-metal', { rough: 0.4, metal: 0.5 })} />
    </group>
  );
}

export function WallClock({ p, rot = 0 }: { p: V3; rot?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <Cy r={0.4} h={0.08} p={[0, 0, 0.04]} rot={[Math.PI / 2, 0, 0]} m={T('--scene-white', { rough: 0.4 })} seg={28} />
      <Cy r={0.43} h={0.05} p={[0, 0, 0.03]} rot={[Math.PI / 2, 0, 0]} m={T('--scene-black', { rough: 0.5 })} seg={28} />
      <B s={[0.04, 0.26, 0.02]} p={[0, 0.1, 0.1]} m={T('--scene-black')} shadow={false} />
      <B s={[0.2, 0.04, 0.02]} p={[0.08, 0, 0.1]} m={T('--scene-black')} shadow={false} />
    </group>
  );
}

/** Jendela lebar di dinding belakang; langit dan siluet kota berupa tekstur tanpa pencahayaan. */
export function WindowBand({ p, w = 2.2, h = 0.9 }: { p: V3; w?: number; h?: number }) {
  const frame = T('--scene-trim', { rough: 0.5 });
  return (
    <group position={p}>
      <B s={[w + 0.2, h + 0.2, 0.1]} p={[0, 0, 0]} m={frame} />
      <Quad w={w} h={h} p={[0, 0, 0.06]} map={tex.sky()} />
      <B s={[0.07, h, 0.12]} p={[0, 0, 0.07]} m={frame} />
      <B s={[w + 0.3, 0.07, 0.3]} p={[0, -h / 2 - 0.14, 0.12]} m={frame} />
    </group>
  );
}

export function Bookshelf({ p, rot = 0, w = 1.5, h = 2.2, seed = 1 }: { p: V3; rot?: number; w?: number; h?: number; seed?: number }) {
  const wood = T('--scene-wood-dark', { rough: 0.7 });
  const r = rand(seed * 13 + 5);
  const palette = ['--scene-fabric-1', '--scene-fabric-2', '--scene-fabric-3', '--scene-wall-2', '--scene-trim', '--scene-wood'];
  const shelves = 4;
  const books: { x: number; y: number; bw: number; bh: number; c: string }[] = [];
  for (let s = 0; s < shelves; s++) {
    let x = -w / 2 + 0.12;
    while (x < w / 2 - 0.2) { const bw = 0.07 + r() * 0.08; books.push({ x: x + bw / 2, y: 0.12 + s * (h / shelves), bw, bh: 0.28 + r() * 0.18, c: palette[Math.floor(r() * palette.length)] }); x += bw + 0.01; if (r() < 0.07) x += 0.3; }
  }
  return (
    <group position={p} rotation-y={rot}>
      <B s={[w, h, 0.05]} p={[0, h / 2, -0.17]} m={wood} />
      <B s={[0.06, h, 0.4]} p={[-w / 2, h / 2, 0]} m={wood} /><B s={[0.06, h, 0.4]} p={[w / 2, h / 2, 0]} m={wood} />
      {Array.from({ length: shelves + 1 }, (_, i) => <B key={i} s={[w, 0.06, 0.4]} p={[0, 0.03 + i * (h / shelves), 0]} m={wood} />)}
      {books.map((b, i) => <B key={i} s={[b.bw, b.bh, 0.28]} p={[b.x, b.y + b.bh / 2 + 0.03, 0]} m={T(b.c, { rough: 0.8 })} />)}
    </group>
  );
}

export function Cabinet({ p, rot = 0 }: { p: V3; rot?: number }) {
  const metal = T('--scene-metal', { rough: 0.45, metal: 0.5 }), dark = T('--scene-metal-dark', { rough: 0.5, metal: 0.5 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[0.9, 1.6, 0.8]} p={[0, 0.8, 0]} m={metal} />
      {[0.3, 0.8, 1.3].map(y => <group key={y}><B s={[0.78, 0.4, 0.04]} p={[0, y, 0.41]} m={T('--scene-metal', { rough: 0.35, metal: 0.4 })} /><B s={[0.3, 0.05, 0.05]} p={[0, y + 0.1, 0.45]} m={dark} /></group>)}
    </group>
  );
}

export function Printer({ p, rot = 0 }: { p: V3; rot?: number }) {
  const wood = T('--scene-wood', { rough: 0.6 }), body = T('--scene-white', { rough: 0.5 }), dark = T('--scene-metal-dark', { rough: 0.5 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[1.1, 0.07, 0.8]} p={[0, 0.95, 0]} m={wood} />
      {[-0.5, 0.5].map(x => <B key={x} s={[0.07, 0.95, 0.7]} p={[x, 0.47, 0]} m={wood} />)}
      <B s={[0.85, 0.42, 0.6]} p={[0, 1.2, 0]} m={body} />
      <B s={[0.7, 0.05, 0.3]} p={[0, 1.44, 0]} m={dark} />
      <B s={[0.6, 0.02, 0.35]} p={[0, 1.0, 0.45]} m={T('--scene-white', { rough: 0.95 })} />
      <B s={[0.12, 0.06, 0.02]} p={[0.25, 1.28, 0.31]} m={T('--color-cool', { emissive: '--color-cool', ei: 0.8 })} shadow={false} />
    </group>
  );
}

export function Bin({ p, c = '--scene-metal-dark' }: { p: V3; c?: string }) {
  return <Cy r={0.26} rb={0.2} h={0.55} p={[p[0], p[1] + 0.28, p[2]]} m={T(c, { rough: 0.6, metal: 0.3 })} seg={16} />;
}

export function Pendant({ p, w = 0.9 }: { p: V3; w?: number }) {
  return (
    <group position={p}>
      <Cy r={0.02} h={0.5} p={[0, 0.5, 0]} m={T('--scene-black')} seg={6} shadow={false} />
      <Cy r={0.12} rb={w / 2} h={0.3} p={[0, 0.1, 0]} m={T('--scene-metal-dark', { rough: 0.4, metal: 0.4 })} seg={20} shadow={false} />
      <Cy r={w / 2 - 0.05} h={0.03} p={[0, -0.06, 0]} m={T('--scene-lamp', { emissive: '--scene-lamp', ei: 1.4 })} seg={20} shadow={false} />
    </group>
  );
}

/* ---------- lobi ---------- */
export function Sofa({ p, w = 3.2, rot = 0, fabric = '--scene-fabric-1' }: { p: V3; w?: number; rot?: number; fabric?: string }) {
  const f = T(fabric, { rough: 0.95 }), f2 = T(fabric, { rough: 1 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[w, 0.4, 1.0]} p={[0, 0.3, 0]} m={f} />
      <B s={[w, 0.95, 0.3]} p={[0, 0.8, -0.38]} m={f} />
      {[-1, 1].map(s => <B key={s} s={[0.3, 0.7, 1.0]} p={[s * (w / 2 - 0.15), 0.55, 0]} m={f} />)}
      {Array.from({ length: 3 }, (_, i) => <B key={i} s={[(w - 0.8) / 3 - 0.04, 0.2, 0.8]} p={[(i - 1) * ((w - 0.8) / 3), 0.6, 0.06]} m={f2} />)}
      {[-1, 1].map(s => <B key={s} s={[0.08, 0.14, 0.08]} p={[s * (w / 2 - 0.1), 0.07, 0.4]} m={T('--scene-metal-dark')} />)}
      <B s={[0.5, 0.45, 0.14]} p={[-w / 4, 0.95, -0.18]} r={[0.2, 0.15, 0.1]} m={T('--scene-fabric-2', { rough: 1 })} />
    </group>
  );
}

export function Armchair({ p, rot = 0 }: { p: V3; rot?: number }) {
  const f = T('--scene-fabric-3', { rough: 0.95 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[1.1, 0.4, 1.0]} p={[0, 0.3, 0]} m={f} />
      <B s={[1.1, 0.85, 0.28]} p={[0, 0.75, -0.36]} m={f} />
      {[-1, 1].map(s => <B key={s} s={[0.22, 0.6, 1.0]} p={[s * 0.5, 0.5, 0]} m={f} />)}
      <B s={[0.8, 0.16, 0.7]} p={[0, 0.58, 0.05]} m={T('--scene-fabric-3', { rough: 1 })} />
    </group>
  );
}

export function CoffeeTable({ p }: { p: V3 }) {
  const wood = T('--scene-wood', { rough: 0.55 }), dark = T('--scene-metal-dark', { metal: 0.4 });
  return (
    <group position={p}>
      <B s={[1.5, 0.08, 0.8]} p={[0, 0.5, 0]} m={wood} />
      {[-0.65, 0.65].flatMap(x => [-0.3, 0.3].map(z => <B key={`${x}${z}`} s={[0.06, 0.48, 0.06]} p={[x, 0.24, z]} m={dark} />))}
      <Mug p={[-0.4, 0.54, 0.05]} c="--scene-white" />
      <B s={[0.42, 0.05, 0.3]} p={[0.35, 0.57, -0.05]} r={[0, 0.3, 0]} m={T('--scene-wall-2', { rough: 0.7 })} />
      <B s={[0.38, 0.04, 0.27]} p={[0.35, 0.61, -0.05]} r={[0, 0.2, 0]} m={T('--scene-fabric-2', { rough: 0.7 })} />
    </group>
  );
}

export function Rug({ p, w, d }: { p: V3; w: number; d: number }) {
  return (
    <mesh position={p} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex.rug()} roughness={1} />
    </mesh>
  );
}

export function FloorLamp({ p }: { p: V3 }) {
  const dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={p}>
      <Cy r={0.22} h={0.05} p={[0, 0.03, 0]} m={dark} seg={16} />
      <Cy r={0.03} h={2.1} p={[0, 1.08, 0]} m={dark} seg={8} />
      <Cy r={0.3} rb={0.38} h={0.5} p={[0, 2.2, 0]} m={T('--scene-lamp', { rough: 0.9, emissive: '--scene-lamp', ei: 0.5 })} seg={20} shadow={false} />
    </group>
  );
}

/* ---------- pantry ---------- */
export function Fridge({ p, rot = 0 }: { p: V3; rot?: number }) {
  const body = T('--scene-white', { rough: 0.3, metal: 0.2 }), dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[1.0, 2.3, 0.95]} p={[0, 1.15, 0]} m={body} />
      <B s={[0.98, 0.03, 0.02]} p={[0, 1.5, 0.48]} m={dark} />
      <B s={[0.04, 0.5, 0.05]} p={[0.38, 1.9, 0.52]} m={dark} /><B s={[0.04, 0.7, 0.05]} p={[0.38, 1.0, 0.52]} m={dark} />
    </group>
  );
}

/** Deretan lemari dapur: lemari bawah, meja marmer, wastafel, lemari atas. */
export function KitchenRun({ p, w = 3.4, uppers = true }: { p: V3; w?: number; uppers?: boolean }) {
  const door = T('--scene-wood-dark', { rough: 0.6 }), top = T('--scene-marble', { rough: 0.3 }), dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 }), metal = T('--scene-metal', { metal: 0.7, rough: 0.25 });
  const n = Math.round(w / 0.85);
  return (
    <group position={p}>
      <B s={[w, 1.0, 0.8]} p={[0, 0.5, 0]} m={T('--scene-wood-dark', { rough: 0.7 })} />
      {Array.from({ length: n }, (_, i) => { const x = -w / 2 + (i + 0.5) * (w / n); return <group key={i}><B s={[w / n - 0.05, 0.86, 0.03]} p={[x, 0.52, 0.41]} m={door} /><B s={[0.04, 0.2, 0.04]} p={[x + 0.2, 0.75, 0.45]} m={dark} /></group>; })}
      <B s={[w + 0.06, 0.08, 0.9]} p={[0, 1.04, 0.03]} m={top} />
      <B s={[0.7, 0.04, 0.5]} p={[-w / 2 + 1.2, 1.1, 0.03]} m={metal} />
      <Cy r={0.025} h={0.4} p={[-w / 2 + 1.2, 1.3, -0.25]} m={metal} seg={8} />
      <B s={[0.03, 0.03, 0.22]} p={[-w / 2 + 1.2, 1.5, -0.15]} m={metal} />
      {uppers && <B s={[w, 0.9, 0.5]} p={[0, 2.35, -0.15]} m={door} />}
      {uppers && Array.from({ length: n }, (_, i) => { const x = -w / 2 + (i + 0.5) * (w / n); return <B key={i} s={[w / n - 0.05, 0.78, 0.03]} p={[x, 2.35, 0.12]} m={T('--scene-wood', { rough: 0.6 })} />; })}
    </group>
  );
}

export function CoffeeMachine({ p }: { p: V3 }) {
  const dark = T('--scene-black', { rough: 0.3, metal: 0.5 });
  return (
    <group position={p}>
      <B s={[0.55, 0.62, 0.45]} p={[0, 0.31, 0]} m={dark} />
      <B s={[0.58, 0.12, 0.48]} p={[0, 0.68, 0]} m={T('--scene-metal', { metal: 0.7, rough: 0.3 })} />
      <B s={[0.3, 0.04, 0.2]} p={[0, 0.12, 0.28]} m={T('--scene-metal', { metal: 0.7, rough: 0.3 })} />
      <Mug p={[0, 0.14, 0.28]} c="--scene-white" />
      <B s={[0.08, 0.05, 0.02]} p={[0.18, 0.46, 0.24]} m={T('--color-ok', { emissive: '--color-ok', ei: 1 })} shadow={false} />
    </group>
  );
}

export function Microwave({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B s={[0.7, 0.42, 0.5]} p={[0, 0.21, 0]} m={T('--scene-metal', { metal: 0.6, rough: 0.35 })} />
      <B s={[0.44, 0.3, 0.02]} p={[-0.07, 0.21, 0.26]} m={T('--scene-black', { rough: 0.2 })} />
    </group>
  );
}

export function WaterCooler({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <B s={[0.55, 1.1, 0.5]} p={[0, 0.55, 0]} m={T('--scene-white', { rough: 0.4 })} />
      <Cy r={0.2} h={0.55} p={[0, 1.4, 0]} m={T('--color-cool', { rough: 0.15, opacity: 0.6 })} seg={16} />
      <B s={[0.08, 0.06, 0.06]} p={[-0.1, 0.8, 0.28]} m={T('--color-cool', { emissive: '--color-cool', ei: 0.6 })} shadow={false} />
      <B s={[0.08, 0.06, 0.06]} p={[0.1, 0.8, 0.28]} m={T('--color-bad', { emissive: '--color-bad', ei: 0.6 })} shadow={false} />
    </group>
  );
}

export function RoundTable({ p, r = 0.7 }: { p: V3; r?: number }) {
  return (
    <group position={p}>
      <Cy r={r} h={0.08} p={[0, 0.96, 0]} m={T('--scene-wood', { rough: 0.5 })} seg={28} />
      <Cy r={0.07} h={0.92} p={[0, 0.48, 0]} m={T('--scene-metal-dark', { metal: 0.5 })} seg={10} />
      <Cy r={0.4} h={0.05} p={[0, 0.03, 0]} m={T('--scene-metal-dark', { metal: 0.5 })} seg={18} />
      <Mug p={[0.2, 1.0, 0.1]} c="--scene-fabric-1" />
    </group>
  );
}

export function Stool({ p, c = '--scene-fabric-2' }: { p: V3; c?: string }) {
  return (
    <group position={p}>
      <Cy r={0.26} h={0.1} p={[0, 0.72, 0]} m={T(c, { rough: 0.9 })} seg={16} />
      <Cy r={0.04} h={0.68} p={[0, 0.36, 0]} m={T('--scene-metal-dark', { metal: 0.5 })} seg={8} />
      <Cy r={0.26} h={0.04} p={[0, 0.02, 0]} m={T('--scene-metal-dark', { metal: 0.5 })} seg={16} />
    </group>
  );
}

/* ---------- ruang rapat ---------- */
export function ConfTable({ p, w = 3.6, d = 1.5 }: { p: V3; w?: number; d?: number }) {
  const top = T('--scene-wood', { rough: 0.35, map: tex.wood(w, d) }), dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={p}>
      <B s={[w, 0.1, d]} p={[0, 1.0, 0]} m={top} />
      {[-w / 2 + 0.45, w / 2 - 0.45].map(x => <B key={x} s={[0.14, 0.95, d - 0.5]} p={[x, 0.48, 0]} m={dark} />)}
      <B s={[0.5, 0.02, 0.35]} p={[-0.9, 1.06, 0.2]} m={T('--scene-metal', { metal: 0.7, rough: 0.3 })} />
      <Papers p={[0.7, 1.05, -0.2]} rot={0.4} />
      <Mug p={[0.1, 1.05, 0.3]} c="--scene-white" />
    </group>
  );
}

export function MeetingChair({ p, rot = 0, c = '--scene-fabric-3' }: { p: V3; rot?: number; c?: string }) {
  const f = T(c, { rough: 0.95 }), dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[0.72, 0.1, 0.72]} p={[0, 0.5, 0]} m={f} />
      <B s={[0.7, 0.7, 0.08]} p={[0, 0.92, 0.33]} m={f} />
      {[-0.3, 0.3].flatMap(x => [-0.3, 0.3].map(z => <B key={`${x}${z}`} s={[0.05, 0.48, 0.05]} p={[x, 0.24, z]} m={dark} />))}
    </group>
  );
}

/** Layar dinding bergambar kode atau presentasi. */
export function WallScreen({ p, w = 3.2, h = 1.7, map }: { p: V3; w?: number; h?: number; map: THREE.Texture }) {
  return (
    <group position={p}>
      <B s={[w + 0.14, h + 0.14, 0.1]} p={[0, 0, 0]} m={T('--scene-black', { rough: 0.3 })} />
      <Quad w={w} h={h} p={[0, 0, 0.06]} map={map} />
    </group>
  );
}

/* ---------- koridor ---------- */
export function Bench({ p, w = 2.4, rot = 0 }: { p: V3; w?: number; rot?: number }) {
  const wood = T('--scene-wood', { rough: 0.6 }), dark = T('--scene-metal-dark', { metal: 0.5 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[w, 0.1, 0.6]} p={[0, 0.55, 0]} m={wood} />
      <B s={[w, 0.5, 0.08]} p={[0, 0.85, -0.27]} m={wood} />
      {[-w / 2 + 0.2, w / 2 - 0.2].map(x => <B key={x} s={[0.08, 0.55, 0.5]} p={[x, 0.27, 0]} m={dark} />)}
    </group>
  );
}

export function Planter({ p, w = 2.2, seed = 1 }: { p: V3; w?: number; seed?: number }) {
  return (
    <group position={p}>
      <B s={[w, 0.6, 0.7]} p={[0, 0.3, 0]} m={T('--scene-concrete', { rough: 0.9, map: tex.concrete(w, 0.7) })} />
      {Array.from({ length: Math.round(w / 0.55) }, (_, i) => <Sp key={i} r={0.3} p={[-w / 2 + 0.3 + i * 0.55, 0.78 + ((i + seed) % 3) * 0.08, 0]} m={T(i % 2 ? '--scene-plant' : '--scene-plant-2', { rough: 0.9 })} sy={0.8} />)}
    </group>
  );
}

/* ---------- ruangan besar, aula, diskusi ---------- */
/** Skat pembatas antarmeja: panel kain di atas rangka logam. */
export function Partition({ p, len = 1.6, h = 1.5, rot = 0 }: { p: V3; len?: number; h?: number; rot?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <B s={[0.07, h, len]} p={[0, h / 2 + 0.05, 0]} m={T('--scene-fabric-3', { rough: 1 })} />
      <B s={[0.1, 0.06, len + 0.08]} p={[0, h + 0.08, 0]} m={T('--scene-metal', { metal: 0.6, rough: 0.35 })} />
      {[-len / 2, len / 2].map(z => <B key={z} s={[0.16, 0.08, 0.1]} p={[0, 0.04, z]} m={T('--scene-metal-dark', { metal: 0.5 })} />)}
    </group>
  );
}

/** Kursi bioskop/aula; menghadap -z secara bawaan. */
export function TheaterChair({ p, rot = 0 }: { p: V3; rot?: number }) {
  const f = T('--scene-curtain', { rough: 0.95 }), dark = T('--scene-metal-dark', { metal: 0.5 });
  return (
    <group position={p} rotation-y={rot}>
      <B s={[0.7, 0.14, 0.62]} p={[0, 0.44, 0]} m={f} />
      <B s={[0.7, 0.75, 0.12]} p={[0, 0.85, 0.3]} m={f} />
      <B s={[0.08, 0.4, 0.5]} p={[-0.38, 0.5, 0.0]} m={dark} /><B s={[0.08, 0.4, 0.5]} p={[0.38, 0.5, 0.0]} m={dark} />
      <B s={[0.5, 0.3, 0.1]} p={[0, 0.15, 0.1]} m={dark} />
    </group>
  );
}

export function Stage({ p, w, d, h = 0.35 }: { p: V3; w: number; d: number; h?: number }) {
  return (
    <group position={p}>
      <B s={[w, h, d]} p={[0, h / 2, 0]} m={T('#ffffff', { rough: 0.5, map: tex.wood(w, d) })} />
      <B s={[w + 0.1, 0.06, d + 0.1]} p={[0, h + 0.02, 0]} m={T('--scene-wood-dark', { rough: 0.6 })} shadow={false} />
    </group>
  );
}

export function Curtain({ p, w = 1.3, h = 3.0 }: { p: V3; w?: number; h?: number }) {
  const m = T('--scene-curtain', { rough: 1 });
  return (
    <group position={p}>
      {Array.from({ length: Math.round(w / 0.26) }, (_, i) => <B key={i} s={[0.2, h, 0.16 + (i % 2) * 0.08]} p={[-w / 2 + 0.13 + i * 0.26, h / 2, 0]} m={m} />)}
      <B s={[w + 0.1, 0.1, 0.12]} p={[0, h + 0.04, 0]} m={T('--scene-metal-dark', { metal: 0.5 })} />
    </group>
  );
}

/** Layar berdiri (tiang) untuk ruangan yang dinding belakangnya rendah. */
export function StandScreen({ p, w = 3.2, h = 1.7, map }: { p: V3; w?: number; h?: number; map: THREE.Texture }) {
  const dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={p}>
      <B s={[0.1, h + 1.0, 0.1]} p={[-w / 2 - 0.1, (h + 1.0) / 2, 0]} m={dark} /><B s={[0.1, h + 1.0, 0.1]} p={[w / 2 + 0.1, (h + 1.0) / 2, 0]} m={dark} />
      <group position={[0, 0.9 + h / 2, 0]}>
        <B s={[w + 0.14, h + 0.14, 0.1]} p={[0, 0, 0]} m={T('--scene-black', { rough: 0.3 })} />
        <Quad w={w} h={h} p={[0, 0, 0.06]} map={map} />
      </group>
    </group>
  );
}

export function Podium({ p, rot = 0 }: { p: V3; rot?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <B s={[0.9, 1.1, 0.6]} p={[0, 0.55, 0]} m={T('--scene-wood-dark', { rough: 0.5 })} />
      <B s={[1.0, 0.06, 0.7]} p={[0, 1.13, 0]} m={T('--scene-wood', { rough: 0.4 })} />
      <B s={[0.5, 0.02, 0.35]} p={[0, 1.18, 0]} r={[-0.2, 0, 0]} m={T('--scene-metal', { metal: 0.6, rough: 0.3 })} />
    </group>
  );
}

export function Column({ p, h }: { p: V3; h: number }) {
  return <B s={[0.5, h, 0.5]} p={[p[0], p[1] + h / 2, p[2]]} m={T('--scene-concrete', { rough: 0.85, map: tex.concrete(0.5, h) })} />;
}

export function StreetLamp({ p }: { p: V3 }) {
  const dark = T('--scene-metal-dark', { metal: 0.5, rough: 0.5 });
  return (
    <group position={p}>
      <Cy r={0.07} h={4.2} p={[0, 2.1, 0]} m={dark} seg={8} />
      <B s={[0.9, 0.08, 0.12]} p={[0.4, 4.2, 0]} m={dark} />
      <B s={[0.4, 0.1, 0.25]} p={[0.8, 4.12, 0]} m={T('--scene-lamp', { emissive: '--scene-lamp', ei: 1.2 })} shadow={false} />
    </group>
  );
}

export function Tree({ p, s = 1, seed = 1 }: { p: V3; s?: number; seed?: number }) {
  const r = rand(seed * 17 + 3);
  const leaf = T('--scene-plant', { rough: 0.95 }), leaf2 = T('--scene-plant-2', { rough: 0.95 });
  return (
    <group position={p} scale={s}>
      <Cy r={0.22} rb={0.3} h={2.2} p={[0, 1.1, 0]} m={T('--scene-trunk', { rough: 0.9 })} seg={8} />
      {Array.from({ length: 6 }, (_, i) => <Sp key={i} r={0.9 + r() * 0.5} p={[(r() - 0.5) * 1.4, 2.7 + r() * 1.3, (r() - 0.5) * 1.4]} m={i % 2 ? leaf : leaf2} sy={0.9} />)}
    </group>
  );
}

export function Car({ c = '--scene-car-1' }: { c?: string }) {
  const body = T(c, { rough: 0.35, metal: 0.4 }), glass = T('--scene-glass', { rough: 0.1, metal: 0.3 }), dark = T('--scene-black', { rough: 0.8 });
  return (
    <group>
      <B s={[3.4, 0.7, 1.6]} p={[0, 0.65, 0]} m={body} />
      <B s={[1.8, 0.6, 1.5]} p={[-0.1, 1.28, 0]} m={glass} />
      <B s={[1.7, 0.08, 1.56]} p={[-0.1, 1.62, 0]} m={body} />
      {[-1.1, 1.1].flatMap(x => [-0.8, 0.8].map(z => <Cy key={`${x}${z}`} r={0.33} h={0.25} p={[x, 0.33, z]} rot={[Math.PI / 2, 0, 0]} m={dark} seg={14} />))}
      <B s={[0.06, 0.18, 0.3]} p={[1.72, 0.7, -0.5]} m={T('--scene-lamp', { emissive: '--scene-lamp', ei: 1 })} shadow={false} />
      <B s={[0.06, 0.18, 0.3]} p={[1.72, 0.7, 0.5]} m={T('--scene-lamp', { emissive: '--scene-lamp', ei: 1 })} shadow={false} />
    </group>
  );
}
