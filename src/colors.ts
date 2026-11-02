import * as THREE from 'three';

const cache = new Map<string, THREE.Color>();
let ctx: CanvasRenderingContext2D | null = null;

/** Mengubah warna CSS apa pun (termasuk oklch) ke THREE.Color lewat kanvas. */
function toColor(raw: string): THREE.Color {
  const hit = cache.get(raw);
  if (hit) return hit;
  ctx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.canvas.width = ctx.canvas.height = 1;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const c = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  cache.set(raw, c);
  return c;
}

/** Nilai mentah sebuah token CSS, mis. untuk dipakai di kanvas tekstur. */
export const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#808080';

/** Membaca token CSS (mis. oklch) dan mengubahnya ke THREE.Color. */
export const token = (name: string): THREE.Color => toColor(css(name));

/** Nama token ("--scene-wall") atau warna CSS biasa. */
export const col = (nameOrCss: string): THREE.Color => (nameOrCss.startsWith('--') ? token(nameOrCss) : toColor(nameOrCss));

export const agentColor = (i: number) => token(`--scene-agent-${(i % 6) + 1}`);
