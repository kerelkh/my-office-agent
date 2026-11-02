import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { route, visibleAt, type Layout, type Pt, type Spot } from '../layout';
import { Figure, SEAT_DROP, applyPose, makeLook, type FigureRefs } from './Figure';
import { positions } from '../positions';
import { separate } from '../physics';
import type { Pose } from '../types';

/** NPC pemanis: pengunjung dan staf lain yang berkeliaran santai, duduk, minum kopi, atau menonton di aula. Tidak memakai kuota. */
const occupied = new Set<string>();
const keyOf = (s: Spot) => `${s.floor}:${s.x.toFixed(1)}:${s.z.toFixed(1)}`;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const NPC_SPEED = 2.3;

type Mode = 'wait' | 'walk' | 'dwell';

export function Npc({ index, layout }: { index: number; layout: Layout }) {
  const root = useRef<THREE.Group>(null!);
  const refs: FigureRefs = {
    legL: useRef<THREE.Group>(null!), legR: useRef<THREE.Group>(null!), armL: useRef<THREE.Group>(null!), armR: useRef<THREE.Group>(null!),
    head: useRef<THREE.Group>(null!), torso: useRef<THREE.Group>(null!), paper: useRef<THREE.Group>(null!), cup: useRef<THREE.Mesh>(null!),
  };
  const look = useMemo(() => makeLook(index + 5, `--scene-npc-${(index % 6) + 1}`), [index]);
  const layoutRef = useRef(layout); layoutRef.current = layout;
  const id = `npc-${index}`;
  useEffect(() => () => { delete positions[id]; }, [id]);
  const s = useRef({
    mode: 'wait' as Mode, until: 0, path: [] as Pt[], idx: 0, seg: [0, 0, 0] as Pt, y: 0, heading: 0, want: 0, seat: 0,
    sit: false, pose: 'none' as Pose, spot: null as Spot | null, seed: Math.random() * 6,
  });

  // mulai dari titik berdiri acak di lantai mana pun
  useEffect(() => {
    const L = layoutRef.current;
    const start = L.spots.stand[Math.floor(Math.random() * L.spots.stand.length)];
    const st = s.current;
    if (start) { root.current.position.set(start.x + rnd(-0.6, 0.6), start.y, start.z); st.y = start.y; st.seg = [start.x, start.z, start.y]; }
    st.until = performance.now() / 1000 + rnd(1, 6);
    return () => { if (st.spot) occupied.delete(keyOf(st.spot)); };
  }, []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), t = state.clock.elapsedTime, now = performance.now() / 1000;
    const L = layoutRef.current, st = s.current, g = root.current;
    const sf = useStore.getState();
    g.visible = visibleAt(st.y, sf.viewFloor);
    const pos: Pt = [g.position.x, g.position.z, st.y];
    let moving = false;

    if (st.mode === 'wait' && now >= st.until) {
      const pool: { s: Spot; w: number; pose: Pose }[] = [
        ...L.spots.stand.map(x => ({ s: x, w: 4, pose: 'look' as Pose })), ...L.spots.sofa.map(x => ({ s: x, w: 3, pose: 'read' as Pose })),
        ...L.spots.seats.map(x => ({ s: x, w: 2, pose: 'none' as Pose })), ...L.spots.view.map(x => ({ s: x, w: 3, pose: 'none' as Pose })),
        ...L.spots.coffee.map(x => ({ s: x, w: 2, pose: 'drink' as Pose })), ...L.spots.water.map(x => ({ s: x, w: 1, pose: 'drink' as Pose })),
        ...L.spots.park.map(x => ({ s: x, w: 3, pose: 'look' as Pose })), ...L.spots.bench.map(x => ({ s: x, w: 2.5, pose: 'none' as Pose })),
        ...L.spots.cafe.map(x => ({ s: x, w: 1.5, pose: 'drink' as Pose })), ...L.spots.cafeSeat.map(x => ({ s: x, w: 2, pose: 'drink' as Pose })),
      ].filter(c => !occupied.has(keyOf(c.s)));
      const total = pool.reduce((a, c) => a + c.w, 0);
      let roll = Math.random() * total, pick = pool[0];
      for (const c of pool) { roll -= c.w; if (roll <= 0) { pick = c; break; } }
      if (pick) {
        if (st.spot) occupied.delete(keyOf(st.spot));
        st.spot = pick.s; occupied.add(keyOf(pick.s)); st.pose = pick.pose;
        st.path = route(L, pos, [pick.s.x, pick.s.z, pick.s.y]); st.idx = 0; st.seg = pos; st.mode = 'walk'; st.sit = false;
      } else st.until = now + 3;
    }

    if (st.mode === 'walk') {
      if (st.idx >= st.path.length) {
        st.mode = 'dwell'; st.sit = !!st.spot?.sit; st.want = st.spot?.face ?? st.heading;
        st.until = now + (st.sit ? rnd(14, 50) : rnd(6, 24));
      } else {
        const [tx, tz, ty] = st.path[st.idx];
        const dx = tx - pos[0], dz = tz - pos[1], d = Math.hypot(dx, dz), sp = NPC_SPEED * sf.speed * dt;
        if (d <= sp) { g.position.x = tx; g.position.z = tz; st.y = ty; st.idx++; st.seg = [tx, tz, ty]; }
        else {
          g.position.x += dx / d * sp; g.position.z += dz / d * sp; st.want = Math.atan2(dx, dz); moving = true;
          const tot = Math.max(0.01, Math.hypot(tx - st.seg[0], tz - st.seg[1]));
          st.y = st.seg[2] + (ty - st.seg[2]) * Math.min(1, 1 - d / tot);
        }
      }
    } else if (st.mode === 'dwell' && now >= st.until) { st.mode = 'wait'; st.until = now + rnd(1, 8); st.sit = false; st.pose = 'none'; }

    const d = ((st.want - st.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    st.heading += d * Math.min(1, dt * 8);
    g.rotation.y = st.heading;
    positions[id] = { x: g.position.x, z: g.position.z, y: st.y };
    if (!(st.mode === 'dwell' && st.sit)) {
      const [px, pz] = separate(L, id, g.position.x, g.position.z, st.y, dt);
      g.position.x += px; g.position.z += pz;
    }
    const sitting = !moving && st.mode === 'dwell' && st.sit;
    st.seat += ((sitting ? 1 : 0) - st.seat) * Math.min(1, dt * 9);
    g.position.y = st.y + (moving ? Math.abs(Math.sin(t * 8)) * 0.1 : 0) - SEAT_DROP * st.seat;
    applyPose(refs, { moving, sit: st.seat, carrying: false, working: false, pose: moving || st.mode !== 'dwell' ? 'none' : st.pose, seed: st.seed }, dt, t * 0.8);
  });

  return <group ref={root}><Figure look={look} refs={refs} /></group>;
}
