import type { RoomKind, Workspace } from './types';

/* ===================== konstanta bangunan ===================== */
export const ROOM_DEPTH = 7;
export const FLOOR_H = 4.6;
export const WALL_H = 3.2;
export const LOW_WALL_H = 1.05;
export const DESK_SPACING = 3.4;
export const GAP = 0.3;                 // celah antarruangan dalam satu baris
export const CORR_FRONT = 5.0;          // lobi utama / koridor depan: z 3.5 .. 8.5
export const CORR_INNER = 3.2;          // lorong dalam di antara dua baris
export const HALL_W = 4.8;              // aula tangga di ujung kiri
export const SIDE_W = 2.6;              // lorong penghubung di ujung kanan
export const ROW_CZ = [0, -10.2] as const;
export const DOOR_W = 2.2;
export const Z_FRONT = 3.5 + CORR_FRONT;

/** Titik di dunia: x, z, y (ketinggian). */
export type Pt = [number, number, number];
export type Rect = [number, number, number, number]; // x0, z0, x1, z1

export interface RoomLayout {
  id: string; name: string; kind: RoomKind; floor: number; row: 0 | 1;
  cx: number; cz: number; y: number; width: number; x0: number; x1: number; z0: number; z1: number;
  count: number;
  /** dinding belakang dipotong rendah karena ada lorong dan ruangan di belakangnya */
  cutBack: boolean;
}
export interface DeskLayout { roleId: string; roomId: string; floor: number; x: number; z: number; y: number }
export interface Spot { x: number; z: number; y: number; face: number; sit?: boolean; roomId: string; floor: number }
export interface Spots {
  coffee: Spot[]; water: Spot[];
  /** tempat duduk: bangku pantry, kursi rapat dan diskusi */
  seats: Spot[];
  sofa: Spot[];
  /** kursi aula, menghadap layar */
  view: Spot[];
  /** titik berdiri bebas di tiap ruangan atau lobi */
  stand: Spot[];
  /** di luar gedung: titik jalan-jalan di plaza, taman, dan trotoar */
  park: Spot[];
  /** bangku di plaza, taman, dan halte */
  bench: Spot[];
  /** tempat memesan kopi di kafe seberang */
  cafe: Spot[];
  /** kursi kafe */
  cafeSeat: Spot[];
}

/** Rencana area luar gedung. Sumber tunggal untuk navigasi dan untuk gambar di scene. */
export interface Outdoor {
  plaza: Rect;
  lawn: Rect;
  fountain: { x: number; z: number; r: number };
  benches: { x: number; z: number; face: number }[];
  trees: { x: number; z: number; s: number }[];
  cafe: { x: number; z: number; w: number; d: number; tables: { x: number; z: number }[] };
  bus: { x: number; z: number };
  road: number;
  /** titik karyawan kontrak datang dan pergi */
  spawn: { x: number; z: number };
}
export interface Wall { floor: number; rect: Rect; low: boolean; roomId?: string; side?: 'back' | 'left' | 'right' | 'front' | 'edge' }
export interface Door { roomId: string; floor: number; x: number; z: number; w: number }
export interface Stair { floor: number; lx: number; zb: number; zt: number; y0: number; y1: number }
export interface Hole { floor: number; rect: Rect }

export interface Layout {
  rooms: RoomLayout[];
  desks: Record<string, DeskLayout>;
  spots: Spots;
  floors: number;
  walls: Wall[];
  doors: Door[];
  stairs: Stair[];
  holes: Hole[];
  obstacles: { floor: number; rect: Rect }[];
  /** batas bangunan (semua lantai sama) */
  bounds: { x0: number; x1: number; z0: number; z1: number };
  /** x kiri dan kanan deretan ruangan */
  strip: { x0: number; x1: number };
  hasBack: boolean[];
  width: number;
  navs: Nav[];
  outdoor: Outdoor;
}

export const floorY = (f: number) => f * FLOOR_H;
export const floorOf = (y: number) => Math.max(0, Math.round(y / FLOOR_H));
/**
 * Apakah sesuatu pada ketinggian y tampak saat lantai `viewFloor` dipilih? Karakter di lantai terpilih dan yang sedang naik atau turun tangga
 * menuju atau dari lantai itu tampak; yang sudah sampai di lantai atasnya disembunyikan.
 */
export const visibleAt = (y: number, viewFloor: number) => y >= viewFloor * FLOOR_H - 3 && y <= (viewFloor + 1) * FLOOR_H - 0.4;
export const homePt = (d: DeskLayout): Pt => [d.x, d.z, d.y];

/* ===================== navigasi A* ===================== */
class Nav {
  readonly cs = 0.5;
  readonly w: number; readonly h: number;
  private raw: Uint8Array; private ok: Uint8Array;
  constructor(private b: { x0: number; z0: number; x1: number; z1: number }, blocked: Rect[]) {
    this.w = Math.ceil((b.x1 - b.x0) / this.cs); this.h = Math.ceil((b.z1 - b.z0) / this.cs);
    this.raw = new Uint8Array(this.w * this.h).fill(1);
    for (const [x0, z0, x1, z1] of blocked) {
      const i0 = Math.max(0, Math.floor((x0 - b.x0) / this.cs)), i1 = Math.min(this.w - 1, Math.floor((x1 - b.x0) / this.cs));
      const j0 = Math.max(0, Math.floor((z0 - b.z0) / this.cs)), j1 = Math.min(this.h - 1, Math.floor((z1 - b.z0) / this.cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.raw[j * this.w + i] = 0;
    }
    // beri jarak dari tembok dan perabot sebesar satu sel
    this.ok = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      let free = 1;
      for (let dj = -1; dj <= 1 && free; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, c = j + dj;
        if (a < 0 || c < 0 || a >= this.w || c >= this.h || !this.raw[c * this.w + a]) { free = 0; break; }
      }
      this.ok[j * this.w + i] = free;
    }
  }
  /** Apakah titik ini bebas dari tembok dan perabot (tanpa jarak aman)? */
  open(x: number, z: number): boolean {
    if (x < this.b.x0 || x > this.b.x1 || z < this.b.z0 || z > this.b.z1) return false;
    const [i, j] = this.cell(x, z);
    return !!this.raw[j * this.w + i];
  }
  private cell(x: number, z: number): [number, number] {
    return [Math.min(this.w - 1, Math.max(0, Math.floor((x - this.b.x0) / this.cs))), Math.min(this.h - 1, Math.max(0, Math.floor((z - this.b.z0) / this.cs)))];
  }
  private world(i: number, j: number): [number, number] { return [this.b.x0 + (i + 0.5) * this.cs, this.b.z0 + (j + 0.5) * this.cs]; }
  private snap(x: number, z: number): [number, number] | null {
    const [ci, cj] = this.cell(x, z);
    for (const grid of [this.ok, this.raw]) {
      if (grid[cj * this.w + ci]) return [ci, cj];
      for (let r = 1; r <= 14; r++) {
        let best: [number, number] | null = null, bd = 1e9;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = ci + di, c = cj + dj;
          if (a < 0 || c < 0 || a >= this.w || c >= this.h || !grid[c * this.w + a]) continue;
          const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, c]; }
        }
        if (best) return best;
      }
    }
    return null;
  }
  private los(ax: number, az: number, bx: number, bz: number) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2));
    for (let k = 0; k <= n; k++) {
      const [i, j] = this.cell(ax + (bx - ax) * k / n, az + (bz - az) * k / n);
      if (!this.ok[j * this.w + i]) return false;
    }
    return true;
  }
  /** Jalur dari a ke b dalam satu lantai, sudah diluruskan. Null bila tidak tersambung. */
  path(a: [number, number], b: [number, number]): [number, number][] | null {
    const s = this.snap(a[0], a[1]), g = this.snap(b[0], b[1]);
    if (!s || !g) return null;
    const W = this.w, N = W * this.h;
    const gS = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap: number[] = [], f = new Float32Array(N);
    const hx = (i: number) => { const x = i % W - g[0], y = Math.floor(i / W) - g[1]; const dx = Math.abs(x), dy = Math.abs(y); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const push = (i: number) => { heap.push(i); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (f[heap[p]] <= f[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l; if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const si = s[1] * W + s[0], gi = g[1] * W + g[0];
    gS[si] = 0; f[si] = hx(si); push(si);
    const grid = this.ok[si] ? this.ok : this.raw;
    while (heap.length) {
      const cur = pop();
      if (cur === gi) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % W, cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = ci + di, c = cj + dj;
        if (a < 0 || c < 0 || a >= W || c >= this.h) continue;
        const ni = c * W + a;
        if (closed[ni] || !(this.ok[ni] || (grid === this.raw && this.raw[ni]))) continue;
        if (di && dj && (!this.ok[cj * W + a] || !this.ok[c * W + ci])) continue; // jangan memotong sudut
        const t = gS[cur] + (di && dj ? Math.SQRT2 : 1);
        if (t < gS[ni]) { gS[ni] = t; came[ni] = cur; f[ni] = t + hx(ni); push(ni); }
      }
    }
    if (gi !== si && came[gi] < 0) return null;
    const cells: [number, number][] = [];
    for (let c = gi; c >= 0; c = came[c]) { cells.push(this.world(c % W, Math.floor(c / W))); if (c === si) break; }
    cells.reverse();
    const pts: [number, number][] = [[a[0], a[1]], ...cells, [b[0], b[1]]];
    const out: [number, number][] = [];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.los(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
      out.push(pts[j]); i = j;
    }
    return out;
  }
}
export type { Nav };

/* ===================== penyusunan ===================== */
const rectOf = (cx: number, cz: number, x0: number, z0: number, x1: number, z1: number): Rect => [cx + x0, cz + z0, cx + x1, cz + z1];
const toward = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);

function baseWidth(kind: RoomKind, wide: boolean, desks: number) {
  if (kind === 'kerja') return Math.max(6, desks * DESK_SPACING + 1.2);
  const w = { pantry: 6.5, rapat: 8, lobi: 9, aula: 14, diskusi: 8 }[kind];
  return wide ? w * 1.5 : w;
}

const cache = new WeakMap<Workspace, Layout>();

export function computeLayout(ws: Workspace): Layout {
  const hit = cache.get(ws);
  if (hit) return hit;

  const rooms: RoomLayout[] = [];
  const desks: Record<string, DeskLayout> = {};
  const spots: Spots = { coffee: [], water: [], seats: [], sofa: [], view: [], stand: [], park: [], bench: [], cafe: [], cafeSeat: [] };
  const walls: Wall[] = [], doors: Door[] = [], obstacles: { floor: number; rect: Rect }[] = [];

  const floors = Math.max(1, ...ws.rooms.map(r => r.floor + 1));
  const strips = new Map<string, typeof ws.rooms>();
  for (const r of ws.rooms) { const k = `${r.floor}:${r.row}`; strips.set(k, [...(strips.get(k) ?? []), r]); }
  const deskCount = (id: string) => ws.roles.filter(x => x.roomId === id).length;
  const widthOf = (r: (typeof ws.rooms)[number]) => baseWidth(r.kind, r.wide, deskCount(r.id));
  const stripW = (list: typeof ws.rooms) => list.reduce((s, r) => s + widthOf(r), 0) + GAP * Math.max(0, list.length - 1);
  const Wb = Math.max(14, ...[...strips.values()].map(stripW));
  const X0 = -Wb / 2, X1 = X0 + Wb;
  const hasBack = Array.from({ length: floors }, (_, f) => (strips.get(`${f}:1`)?.length ?? 0) > 0);
  const anyBack = hasBack.some(Boolean);
  const bounds = { x0: X0 - HALL_W, x1: X1 + SIDE_W, z0: anyBack ? ROW_CZ[1] - 3.5 : -3.5, z1: Z_FRONT };

  for (let f = 0; f < floors; f++) {
    const y = floorY(f);
    for (const row of [0, 1] as const) {
      const list = strips.get(`${f}:${row}`) ?? [];
      let cursor = X0;
      for (const r of list) {
        const w = widthOf(r), cx = cursor + w / 2, cz = ROW_CZ[row];
        const n = deskCount(r.id);
        const rl: RoomLayout = { id: r.id, name: r.name, kind: r.kind, floor: f, row, cx, cz, y, width: w, x0: cursor, x1: cursor + w, z0: cz - 3.5, z1: cz + 3.5, count: n, cutBack: row === 0 && hasBack[f] };
        rooms.push(rl);
        cursor += w + GAP;

        // dinding: belakang, samping, depan dengan celah pintu
        const t = 0.1, dl = cx - DOOR_W / 2, dr = cx + DOOR_W / 2;
        walls.push({ floor: f, roomId: r.id, side: 'back', low: rl.cutBack, rect: [rl.x0 - t, rl.z0 - t, rl.x1 + t, rl.z0 + t] });
        walls.push({ floor: f, roomId: r.id, side: 'left', low: false, rect: [rl.x0 - t, rl.z0 - t, rl.x0 + t, rl.z1 + t] });
        walls.push({ floor: f, roomId: r.id, side: 'right', low: false, rect: [rl.x1 - t, rl.z0 - t, rl.x1 + t, rl.z1 + t] });
        walls.push({ floor: f, roomId: r.id, side: 'front', low: true, rect: [rl.x0 - t, rl.z1 - t, dl, rl.z1 + t] });
        walls.push({ floor: f, roomId: r.id, side: 'front', low: true, rect: [dr, rl.z1 - t, rl.x1 + t, rl.z1 + t] });
        doors.push({ roomId: r.id, floor: f, x: cx, z: rl.z1, w: DOOR_W });

        const S = (x: number, z: number, face: number, sit = false): Spot => ({ x: cx + x, z: cz + z, y, face, sit, roomId: r.id, floor: f });
        const O = (x0: number, z0: number, x1: number, z1: number) => obstacles.push({ floor: f, rect: rectOf(cx, cz, x0, z0, x1, z1) });

        if (r.kind === 'kerja') {
          const mine = ws.roles.filter(x => x.roomId === r.id);
          mine.forEach((role, i) => {
            const dx = (i - (n - 1) / 2) * DESK_SPACING;
            desks[role.id] = { roleId: role.id, roomId: r.id, floor: f, x: cx + dx, z: cz - 0.8, y };
            O(dx - 0.95, -3.0, dx + 1.55, -1.4);
          });
          O(w / 2 - 1.05, -3.45, w / 2 - 0.1, -2.5);
          O(-w / 2 + 0.1, -3.45, -w / 2 + 1.8, -2.65);
          if (n >= 2) O(-w / 2 + 0.2, -0.3, -w / 2 + 1.2, 0.9);
          spots.stand.push(S(-w / 2 + 2.2, 1.8, 0), S(w / 2 - 2, 1.8, 0), S(0, 1.7, 0));
        } else if (r.kind === 'pantry') {
          O(-3.1, -3.45, 0.35, -2.55); O(0.55, -3.45, 1.75, -2.4); O(1.95, -3.35, 2.8, -2.6); O(1.55, -0.55, 3.05, 0.95);
          spots.coffee.push(S(-1.4, -1.85, Math.PI));
          spots.water.push(S(2.35, -2.1, Math.PI));
          spots.seats.push(S(2.3, -1.05, toward(2.3, -1.05, 2.3, 0.2), true), S(1.55, -0.9, toward(1.55, -0.9, 2.3, 0.2), true));
          spots.stand.push(S(1.0, 0.3, Math.PI / 2), S(0.4, 1.4, 0), S(-1.0, 0.6, 0));
        } else if (r.kind === 'rapat') {
          const L = r.wide ? 6.4 : 3.6, n2 = Math.max(3, Math.floor(L / 1.25));
          O(-L / 2 - 0.1, -0.85, L / 2 + 0.1, 0.85); O(-1.8, -3.45, 1.8, -2.8);
          for (let k = 0; k < n2; k++) {
            const x = (k - (n2 - 1) / 2) * 1.2;
            spots.seats.push(S(x, -1.25, 0, true), S(x, 1.25, Math.PI, true));
          }
          spots.seats.push(S(-L / 2 - 0.55, 0, Math.PI / 2, true), S(L / 2 + 0.55, 0, -Math.PI / 2, true));
          spots.stand.push(S(-w / 2 + 1.2, 1.9, 0), S(w / 2 - 1.2, 1.9, 0));
        } else if (r.kind === 'lobi') {
          // lobi dibiarkan lapang: hanya sofa di dinding belakang, jalan tengah bebas
          O(-1.7, -3.45, 1.7, -2.2);
          spots.sofa.push(S(-0.8, -2.45, 0, true), S(0.8, -2.45, 0, true));
          spots.stand.push(S(-w / 2 + 1.6, 0.4, 0), S(w / 2 - 1.6, 0.4, 0), S(0, 0.8, 0), S(-2.2, -1.2, 0), S(2.2, -1.2, 0));
        } else if (r.kind === 'aula') {
          O(-w / 2 + 0.6, -3.45, w / 2 - 0.6, -1.75);
          for (const zz of [-0.5, 0.6, 1.7]) {
            for (let k = 0; k < Math.floor((w - 3) / 1.0); k++) {
              const x = -w / 2 + 1.6 + k * 1.0;
              if (Math.abs(x) < 0.7) continue;
              spots.view.push(S(x, zz, Math.PI, true));
            }
          }
          spots.stand.push(S(-w / 2 + 1.0, 2.4, 0), S(w / 2 - 1.0, 2.4, 0));
        } else if (r.kind === 'diskusi') {
          O(-3.1, -1.2, -1.3, 0.7); O(1.3, -1.2, 3.1, 0.7); O(-w / 2 + 0.1, -3.45, w / 2 - 0.1, -3.0);
          // lima kursi mengelilingi tiap meja bundar dengan jarak sama, tidak ada yang menempel ke meja sebelah
          for (const tx of [-2.2, 2.2]) for (let k = 0; k < 5; k++) {
            const a = 0.31 + k * (Math.PI * 2 / 5);
            const sx = tx + Math.sin(a) * 1.3, sz = -0.25 + Math.cos(a) * 1.3;
            spots.seats.push(S(sx, sz, toward(sx, sz, tx, -0.25), true));
          }
          spots.stand.push(S(0, 1.7, 0));
        }
      }
    }

    // dinding luar: belakang di celah yang tidak tertutup ruangan, samping kiri dan kanan
    const zb = hasBack[f] ? ROW_CZ[1] - 3.5 : -3.5;
    const covered = (rooms.filter(q => q.floor === f && Math.abs(q.z0 - zb) < 0.01)).map(q => [q.x0, q.x1] as const).sort((a, b) => a[0] - b[0]);
    let cur = bounds.x0;
    for (const [a, b] of covered) { if (a > cur + 0.05) walls.push({ floor: f, side: 'edge', low: false, rect: [cur, zb - 0.1, a, zb + 0.1] }); cur = Math.max(cur, b); }
    if (cur < bounds.x1 - 0.05) walls.push({ floor: f, side: 'edge', low: false, rect: [cur, zb - 0.1, bounds.x1, zb + 0.1] });
    walls.push({ floor: f, side: 'edge', low: false, rect: [bounds.x0 - 0.1, zb - 0.1, bounds.x0 + 0.1, bounds.z1 - 0.2] });
    walls.push({ floor: f, side: 'edge', low: false, rect: [bounds.x1 - 0.1, zb - 0.1, bounds.x1 + 0.1, bounds.z1 - 0.2] });
  }

  // tangga: tiap bentang menaiki satu lantai, lajur kiri-kanan bergantian supaya lubang lantai tidak bertabrakan
  const stairs: Stair[] = [], holes: Hole[] = [];
  for (let f = 0; f < floors - 1; f++) {
    const lx = f % 2 === 0 ? X0 - 3.7 : X0 - 1.5;
    stairs.push({ floor: f, lx, zb: 8.0, zt: 2.2, y0: floorY(f), y1: floorY(f + 1) });
    holes.push({ floor: f + 1, rect: [lx - 0.9, 2.45, lx + 0.9, 8.4] });
  }

  // area luar gedung: plaza dengan air mancur, taman, kafe seberang, dan halte
  const outdoor = planOutdoor(bounds);
  const outObstacles: Rect[] = [];
  const gx = (outdoor.plaza[0] + outdoor.plaza[2]) / 2;
  {
    const o = outdoor, y = 0;
    const P = (x: number, z: number, face = 0, sit = false): Spot => ({ x, z, y, face, sit, roomId: 'luar', floor: 0 });
    outObstacles.push([o.fountain.x - o.fountain.r - 0.3, o.fountain.z - o.fountain.r - 0.3, o.fountain.x + o.fountain.r + 0.3, o.fountain.z + o.fountain.r + 0.3]);
    o.benches.forEach(b => { outObstacles.push([b.x - 1.35, b.z - 0.5, b.x + 1.35, b.z + 0.5]); spots.bench.push(P(b.x, b.z + (Math.cos(b.face) >= 0 ? 0.15 : -0.15), b.face, true)); });
    o.trees.forEach(t => outObstacles.push([t.x - 0.8 * t.s, t.z - 0.8 * t.s, t.x + 0.8 * t.s, t.z + 0.8 * t.s]));
    const c = o.cafe;
    outObstacles.push([c.x - c.w / 2, c.z - 0.8, c.x + c.w / 2, c.z + 0.8]);
    spots.cafe.push(P(c.x, c.z + 1.5, Math.PI));
    c.tables.forEach(t => {
      outObstacles.push([t.x - 0.7, t.z - 0.7, t.x + 0.7, t.z + 0.7]);
      spots.cafeSeat.push(P(t.x - 1.15, t.z, Math.PI / 2, true), P(t.x + 1.15, t.z, -Math.PI / 2, true));
    });
    outObstacles.push([o.bus.x - 2.2, o.bus.z - 0.9, o.bus.x + 2.2, o.bus.z + 0.9]);
    spots.bench.push(P(o.bus.x - 0.9, o.bus.z + 0.1, 0, true), P(o.bus.x + 0.9, o.bus.z + 0.1, 0, true));
    [[gx - 11, o.plaza[1] + 2.2], [gx + 10, o.plaza[1] + 3.5], [gx - 3, o.plaza[1] + 9], [gx + 4, o.plaza[1] + 9], [gx, o.plaza[1] + 1.4],
      [o.lawn[0] + 4, (o.lawn[1] + o.lawn[3]) / 2], [o.lawn[2] - 6, o.lawn[1] + 5], [c.x + 4, c.z + 4], [o.bus.x, o.bus.z - 2.5]]
      .forEach(([x, z]) => spots.park.push(P(x, z, 0)));
  }

  // navigasi per lantai; lantai dasar diperluas sampai halaman depan
  const navs: Nav[] = [];
  const nb = { x0: bounds.x0 - 14, z0: bounds.z0 + 0.2, x1: bounds.x1 + 16, z1: bounds.z1 + 18 };
  for (let f = 0; f < floors; f++) {
    const blocked: Rect[] = [
      ...walls.filter(w => w.floor === f).map(w => w.rect),
      ...obstacles.filter(o => o.floor === f).map(o => o.rect),
      ...holes.filter(h => h.floor === f).map(h => h.rect),
      ...stairs.filter(s => s.floor === f).map((s): Rect => [s.lx - 0.9, s.zt + 0.35, s.lx + 0.9, s.zb - 0.5]),
    ];
    if (f === 0) {
      // di samping dan belakang gedung bukan area jalan; halaman depan terbuka
      blocked.push([nb.x0, nb.z0, bounds.x0 - 0.05, bounds.z1 - 0.1], [bounds.x1 + 0.05, nb.z0, nb.x1, bounds.z1 - 0.1], ...outObstacles);
      navs.push(new Nav(nb, blocked));
    } else {
      navs.push(new Nav({ x0: bounds.x0 + 0.2, z0: bounds.z0 + 0.2, x1: bounds.x1 - 0.2, z1: bounds.z1 - 0.2 }, blocked));
    }
  }

  const layout: Layout = { rooms, desks, spots, floors, walls, doors, stairs, holes, obstacles, bounds, strip: { x0: X0, x1: X1 }, hasBack, width: Wb + HALL_W + SIDE_W, navs, outdoor };
  cache.set(ws, layout);
  return layout;
}

/* ===================== rute ===================== */
const dedupe = (from: Pt, pts: Pt[]): Pt[] => {
  const out: Pt[] = [];
  let prev = from;
  for (const p of pts) { if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.05 || Math.abs(p[2] - prev[2]) > 0.05) out.push(p); prev = p; }
  return out;
};

function onFloor(layout: Layout, f: number, a: [number, number], b: [number, number]): [number, number][] {
  return layout.navs[f]?.path(a, b) ?? [b];
}

/** Rute berjalan dari `from` ke `to`, lintas ruangan lewat pintu dan lintas lantai lewat tangga. Titik awal tidak ikut. */
export function route(layout: Layout, from: Pt, to: Pt): Pt[] {
  const fa = Math.min(layout.floors - 1, floorOf(from[2])), fb = Math.min(layout.floors - 1, floorOf(to[2]));
  const out: Pt[] = [];
  let cur: [number, number] = [from[0], from[1]];
  let f = fa;
  while (f !== fb) {
    const up = fb > f;
    const st = layout.stairs[up ? f : f - 1];
    if (!st) break;
    const entry: [number, number] = up ? [st.lx, st.zb] : [st.lx, st.zt];
    onFloor(layout, f, cur, entry).forEach(p => out.push([p[0], p[1], floorY(f)]));
    out.push(up ? [st.lx, st.zt, st.y1] : [st.lx, st.zb, st.y0]);
    cur = up ? [st.lx, st.zt] : [st.lx, st.zb];
    f += up ? 1 : -1;
  }
  onFloor(layout, f, cur, [to[0], to[1]]).forEach(p => out.push([p[0], p[1], floorY(f)]));
  // titik terakhir persis di tujuan, termasuk ketinggiannya
  if (out.length) out[out.length - 1] = [to[0], to[1], to[2]];
  return dedupe(from, out);
}

/** Posisi mana pun ke lantai tempatnya berada. */
/** Bisakah karakter berdiri di sini? Di tangga (y bukan lantai) selalu dianggap bisa. */
export const canStand = (layout: Layout, x: number, z: number, y: number): boolean => {
  const f = y / FLOOR_H;
  if (Math.abs(f - Math.round(f)) > 0.04) return true;
  return layout.navs[Math.round(f)]?.open(x, z) ?? true;
};

export const roomAt =(layout: Layout, p: Pt): RoomLayout | null => {
  const f = floorOf(p[2]);
  return layout.rooms.find(r => r.floor === f && p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.z0 && p[1] <= r.z1) ?? null;
};

/** Titik berdiri pemberi dokumen: di samping kanan meja penerima. */
export const standPt = (d: DeskLayout): Pt => [d.x + 1.7, d.z - 0.1, d.y];
export const pathBetween = (l: Layout, from: DeskLayout, to: DeskLayout): Pt[] => route(l, homePt(from), standPt(to));
export const pathBack = (l: Layout, from: DeskLayout, to: DeskLayout): Pt[] => route(l, standPt(to), homePt(from));

/* ===================== area luar ===================== */
function planOutdoor(b: { x0: number; x1: number; z0: number; z1: number }): Outdoor {
  const cx = (b.x0 + b.x1) / 2, zf = b.z1;
  const fountain = { x: cx, z: zf + 5.5, r: 2.2 };
  const faceFountain = (x: number, z: number) => Math.atan2(fountain.x - x, fountain.z - z);
  const benchAt = (x: number, z: number) => ({ x, z, face: faceFountain(x, z) });
  return {
    plaza: [b.x0 - 8, zf, b.x1 + 8, zf + 10],
    lawn: [cx + 11, zf + 1, b.x1 + 15, zf + 17],
    fountain,
    benches: [benchAt(cx - 5.5, zf + 1.6), benchAt(cx + 5.5, zf + 1.6), benchAt(cx - 5.5, zf + 9.4), benchAt(cx + 5.5, zf + 9.4), { x: cx + 14, z: zf + 11, face: -Math.PI / 2 }],
    trees: [
      { x: cx + 13, z: zf + 3.5, s: 1.1 }, { x: cx + 18, z: zf + 5.5, s: 1.3 }, { x: cx + 15.5, z: zf + 15, s: 1.2 }, { x: b.x1 + 11, z: zf + 9, s: 1.2 },
      { x: b.x0 - 12, z: zf + 14, s: 1.2 }, { x: cx - 18, z: zf + 12.5, s: 1.1 },
    ],
    cafe: { x: b.x0 - 8, z: zf + 3.5, w: 6, d: 6, tables: [{ x: b.x0 - 10.5, z: zf + 7.8 }, { x: b.x0 - 5.5, z: zf + 7.8 }] },
    bus: { x: cx - 14, z: zf + 15.8 },
    road: zf + 24,
    spawn: { x: cx, z: zf + 9.8 },
  };
}
