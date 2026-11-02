import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { homePt, route, visibleAt, type DeskLayout, type Layout, type Pt } from '../layout';
import { labelRoot } from '../labelRoot';
import { positions } from '../positions';
import { separate } from '../physics';
import type { Role } from '../types';
import { Figure, SEAT_DROP, applyPose, makeLook, type FigureRefs } from './Figure';

const WALK_SPEED = 4.2;
const FACE_DESK = Math.PI;     // di meja karyawan menghadap dinding belakang
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
};

interface Props { role: Role; index: number; desk: DeskLayout; layout: Layout }

export function Agent({ role, index, desk, layout }: Props) {
  const root = useRef<THREE.Group>(null!);
  const refs: FigureRefs = {
    legL: useRef<THREE.Group>(null!), legR: useRef<THREE.Group>(null!), armL: useRef<THREE.Group>(null!), armR: useRef<THREE.Group>(null!),
    head: useRef<THREE.Group>(null!), torso: useRef<THREE.Group>(null!), paper: useRef<THREE.Group>(null!), cup: useRef<THREE.Mesh>(null!),
  };
  const ring = useRef<THREE.Mesh>(null!);
  const heading = useRef(FACE_DESK);
  const seat = useRef(1);
  const baseY = useRef(desk.y);
  const path = useRef<Pt[]>([]);
  const idx = useRef(0);
  const seg = useRef<Pt>([desk.x, desk.z, desk.y]);
  const src = useRef<unknown>(null);
  const doneWalk = useRef<unknown>(null);
  const seed = useMemo(() => Math.random() * 6, []);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const look = useMemo(() => makeLook(index, `--scene-agent-${(index % 6) + 1}`), [index]);

  const tag = useStore(s => s.rt[role.id]);
  // label HTML tidak ikut disembunyikan oleh `visible`, jadi keterlihatan agen dilacak sebagai state
  const [shown, setShown] = useState(true);
  const shownRef = useRef(true);

  useEffect(() => {
    if (role.temp) {
      // karyawan kontrak datang dari plaza depan lalu berjalan ke mejanya
      const sp = layoutRef.current.outdoor.spawn;
      root.current.position.set(sp.x, 0, sp.z); baseY.current = 0; seat.current = 0; heading.current = Math.PI; root.current.rotation.y = Math.PI;
    } else { root.current.position.set(desk.x, desk.y, desk.z); baseY.current = desk.y; root.current.rotation.y = FACE_DESK; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), t = state.clock.elapsedTime;
    const st = useStore.getState();
    const rt = st.rt[role.id];
    const g = root.current;
    const pos: Pt = [g.position.x, g.position.z, baseY.current];
    positions[role.id] = { x: pos[0], z: pos[1], y: pos[2] };
    const vis = visibleAt(baseY.current, st.viewFloor);
    g.visible = vis;
    if (vis !== shownRef.current) { shownRef.current = vis; setShown(vis); }
    const home = homePt(desk);
    const homeDist = Math.hypot(pos[0] - home[0], pos[1] - home[1]) + Math.abs(pos[2] - home[2]);

    // sumber jalan: permintaan eksplisit dari store, atau pulang sendiri ke meja bila tidak ada urusan
    const walk = st.walks[role.id];
    if (walk) {
      if (src.current !== walk && doneWalk.current !== walk) { src.current = walk; path.current = walk.pts; idx.current = 0; seg.current = pos; }
    } else {
      doneWalk.current = null;
      if (src.current && src.current !== 'auto') { src.current = null; path.current = []; }
      const free = !rt?.activity && !rt?.carrying;
      if (free && src.current !== 'auto' && homeDist > 0.08) {
        path.current = route(layoutRef.current, pos, home); idx.current = 0; src.current = 'auto'; seg.current = pos;
      } else if (!free && src.current === 'auto') { src.current = null; path.current = []; }
    }

    let moving = false;
    let want = heading.current;
    if (src.current) {
      if (idx.current >= path.current.length) {
        const w = src.current;
        src.current = null;
        path.current = [];
        if (w !== 'auto') { doneWalk.current = w; (w as { resolve: () => void }).resolve(); }
      } else {
        const [tx, tz, ty] = path.current[idx.current];
        const dx = tx - pos[0], dz = tz - pos[1], d = Math.hypot(dx, dz);
        const sp = WALK_SPEED * st.speed * ((src.current as { speed?: number }).speed ?? 1) * dt;
        if (d <= sp) { g.position.x = tx; g.position.z = tz; baseY.current = ty; idx.current++; seg.current = [tx, tz, ty]; }
        else {
          g.position.x += dx / d * sp; g.position.z += dz / d * sp; want = Math.atan2(dx, dz); moving = true;
          const total = Math.max(0.01, Math.hypot(tx - seg.current[0], tz - seg.current[1]));
          baseY.current = seg.current[2] + (ty - seg.current[2]) * Math.min(1, 1 - d / total);
        }
      }
    }
    // tubuh tidak saling menembus: yang sedang duduk atau di meja tetap, yang lain menyingkir
    if (homeDist > 0.3 && seat.current < 0.3) {
      const [px, pz] = separate(layoutRef.current, role.id, g.position.x, g.position.z, baseY.current, dt);
      g.position.x += px; g.position.z += pz;
    }
    const atDesk = homeDist < 0.2 && !moving;
    if (!moving) {
      const other = rt?.faceTo ? positions[rt.faceTo] : null;
      if (other) want = Math.atan2(other.x - pos[0], other.z - pos[1]);
      else if (rt?.heading != null) want = rt.heading;
      else if (atDesk) want = FACE_DESK;
    }
    heading.current = lerpAngle(heading.current, want, Math.min(1, dt * 10));
    g.rotation.y = heading.current;

    const working = !!rt?.working && atDesk, carrying = !!rt?.carrying;
    const pose = moving ? 'none' : rt?.pose ?? 'none';
    const sitting = !moving && !carrying && ((atDesk && pose === 'none' && !rt?.faceTo) || !!rt?.sit);
    seat.current += ((sitting ? 1 : 0) - seat.current) * Math.min(1, dt * 9);
    g.position.y = baseY.current + (moving ? Math.abs(Math.sin(t * 10)) * 0.12 : 0) - SEAT_DROP * seat.current;
    applyPose(refs, { moving, sit: seat.current, carrying, working, pose, seed }, dt, t);
    ring.current.visible = working;
  });

  return (
    <group ref={root}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.05} visible={false}>
        <ringGeometry args={[0.85, 1.0, 40]} />
        <meshBasicMaterial color={look.tie} />
      </mesh>
      <Figure look={look} refs={refs} />
      {shown && <Html position={[0, 3.35, 0]} center zIndexRange={[20, 0]} portal={labelRoot as React.MutableRefObject<HTMLElement>} style={{ pointerEvents: 'none' }}>
        <div className="agent-tag">
          {tag?.bubble && <div className="agent-bubble">{tag.bubble}</div>}
          <div className="agent-label">
            <b>{role.name}</b>
            {/* status hanya tampil selama ada tugas; aktivitas santai tidak ditulis */}
            {tag && (tag.working || tag.carrying || tag.status !== 'Siaga') && (
              <span className={tag.working ? 'is-working' : ''}>{tag.status}</span>
            )}
          </div>
        </div>
      </Html>}
    </group>
  );
}
