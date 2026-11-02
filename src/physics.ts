import { canStand, type Layout } from './layout';
import { positions } from './positions';

const RADIUS = 0.34;           // setengah lebar tubuh; dua karakter tidak boleh lebih dekat dari dua kali ini
const SAME_FLOOR = 1.2;

/**
 * Dorong karakter menjauh dari karakter lain di lantai yang sama. Dorongan dibatalkan bila mendorong ke tembok atau perabot,
 * jadi tubuh tidak pernah menembus dinding. Mengembalikan pergeseran yang dipakai.
 */
export function separate(layout: Layout, id: string, x: number, z: number, y: number, dt: number): [number, number] {
  let px = 0, pz = 0;
  for (const k in positions) {
    if (k === id) continue;
    const o = positions[k];
    if (Math.abs(o.y - y) > SAME_FLOOR) continue;
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = RADIUS * 2;
    if (d >= min) continue;
    // titik yang persis sama: pilih arah dari id supaya dua karakter tidak saling menahan
    const a = d > 0.001 ? Math.atan2(dz, dx) : (k < id ? 0 : Math.PI) + 0.5;
    const push = (min - d) * Math.min(1, dt * 6);
    px += Math.cos(a) * push; pz += Math.sin(a) * push;
  }
  if (!px && !pz) return [0, 0];
  const m = Math.hypot(px, pz), cap = 0.06;
  if (m > cap) { px *= cap / m; pz *= cap / m; }
  if (canStand(layout, x + px, z + pz, y)) return [px, pz];
  if (canStand(layout, x + px, z, y)) return [px, 0];
  if (canStand(layout, x, z + pz, y)) return [0, pz];
  return [0, 0];
}

/** Titik ini sedang dipakai orang lain (duduk atau berdiri di sana)? */
export const spotTaken = (x: number, z: number, y: number, self?: string): boolean => {
  for (const k in positions) {
    if (k === self) continue;
    const o = positions[k];
    if (Math.abs(o.y - y) < SAME_FLOOR && Math.hypot(o.x - x, o.z - z) < 0.55) return true;
  }
  return false;
};
