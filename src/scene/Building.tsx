import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DOOR_W, FLOOR_H, LOW_WALL_H, ROOM_DEPTH, WALL_H, floorY, type Door, type Layout, type Rect, type RoomLayout, type Stair, type Wall,
} from '../layout';
import { useStore } from '../store';
import {
  B, Bin, Bookshelf, Cabinet, CoffeeMachine, ConfTable, Column, Curtain, DeskLamp, FloorLamp, Fridge, KitchenRun, MeetingChair, Microwave,
  mt, Mug, OfficeChair, Papers, Partition, Plant, Planter, Podium, Poster, Printer, Quad, RoundTable, Rug, Sofa, Stage, StandScreen,
  Stool, TheaterChair, WallClock, WallScreen, WaterCooler, Whiteboard, WindowBand,
} from './props';
import { labelTex, tex } from './textures';

const WHITE = '#ffffff';

/* ---------- meja kerja ---------- */
/** Meja menempel ke dinding belakang; karyawan duduk di depannya membelakangi kamera, jadi layar monitor terlihat. */
function Workstation({ roleId, x, index }: { roleId: string; x: number; index: number }) {
  const screenTex = useMemo(() => tex.screen(roleId), [roleId]);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const working = !!useStore.getState().rt[roleId]?.working;
    screenTex.offset.y = (screenTex.offset.y + dt * (working ? 0.4 : 0.015)) % 1;
    screenMat.current.color.setScalar(working ? 1 : 0.5);
  });
  const top = mt(WHITE, { rough: 0.45, map: tex.wood(2.4, 1.4) });
  const panel = mt('--scene-wood-dark', { rough: 0.6 });
  const dark = mt('--scene-metal-dark', { rough: 0.4, metal: 0.5 });
  const fabric = ['--scene-fabric-1', '--scene-fabric-2', '--scene-fabric-3'][index % 3];
  const cx = x + 0.3;
  return (
    <group>
      <B s={[2.4, 0.1, 1.4]} p={[cx, 1.15, -2.2]} m={top} />
      <B s={[0.08, 1.1, 1.3]} p={[cx - 1.16, 0.55, -2.2]} m={panel} />
      <B s={[0.08, 1.1, 1.3]} p={[cx + 1.16, 0.55, -2.2]} m={panel} />
      <B s={[2.3, 0.75, 0.05]} p={[cx, 0.72, -2.85]} m={panel} />
      <B s={[0.75, 0.95, 1.2]} p={[x + 1.0, 0.55, -2.2]} m={panel} />
      {[0.25, 0.6, 0.95].map(y => <group key={y}><B s={[0.68, 0.28, 0.03]} p={[x + 1.0, y - 0.1, -1.6]} m={mt('--scene-wood', { rough: 0.55 })} /><B s={[0.22, 0.04, 0.04]} p={[x + 1.0, y - 0.02, -1.57]} m={dark} /></group>)}
      <group position={[x + 0.8, 1.2, -2.5]} rotation-y={-0.3}>
        <B s={[1.34, 0.88, 0.07]} p={[0, 0.7, 0]} m={mt('--scene-black', { rough: 0.3 })} />
        <mesh position={[0, 0.7, 0.045]}>
          <planeGeometry args={[1.2, 0.74]} />
          <meshBasicMaterial ref={screenMat} map={screenTex} toneMapped={false} />
        </mesh>
        <B s={[0.12, 0.3, 0.08]} p={[0, 0.15, -0.02]} m={dark} />
        <B s={[0.55, 0.04, 0.36]} p={[0, 0.02, 0.02]} m={dark} />
      </group>
      <B s={[0.82, 0.04, 0.28]} p={[x, 1.22, -1.8]} m={mt('--scene-white', { rough: 0.5 })} />
      <B s={[0.12, 0.04, 0.2]} p={[x + 0.62, 1.22, -1.8]} m={dark} />
      <DeskLamp p={[x - 0.75, 1.2, -2.7]} rot={0.3} />
      <Papers p={[x - 0.5, 1.2, -2.1]} rot={0.2} />
      <Mug p={[x + 1.4, 1.2, -1.85]} c={['--scene-fabric-2', '--scene-white', '--scene-fabric-3'][index % 3]} />
      <OfficeChair p={[x, 0, -0.8]} fabric={fabric} />
    </group>
  );
}

/* ---------- isi ruangan ---------- */
interface DecorProps { room: RoomLayout; layout: Layout; index: number }

function WorkDecor({ room, layout, index }: DecorProps) {
  const w = room.width, high = !room.cutBack;
  const mine = Object.values(layout.desks).filter(d => d.roomId === room.id);
  return (
    <>
      {mine.map((dk, i) => <Workstation key={dk.roleId} roleId={dk.roleId} x={dk.x - room.cx} index={index + i} />)}
      {mine.slice(0, -1).map(dk => <Partition key={dk.roleId} p={[dk.x - room.cx + 2.0, 0, -2.25]} len={1.5} h={1.45} rot={0} />)}
      {high && mine.map(dk => <WindowBand key={dk.roleId} p={[dk.x - room.cx + 0.3, 2.55, -ROOM_DEPTH / 2 + 0.12]} w={2.2} h={0.85} />)}
      <Plant p={[w / 2 - 0.55, 0, -2.95]} s={1.15} seed={index + 1} />
      {index % 2 === 0 ? <Bookshelf p={[-w / 2 + 0.95, 0, -3.2]} w={1.4} seed={index + 2} /> : <Cabinet p={[-w / 2 + 0.7, 0, -3.0]} />}
      <Bin p={[-w / 2 + 0.6, 0, -1.9]} />
      {mine.length >= 2 && <Printer p={[-w / 2 + 0.85, 0, 0.5]} rot={Math.PI / 2} />}
      <Poster p={[-w / 2 + 0.13, 1.95, -0.4]} rot={Math.PI / 2} i={index} />
      <Whiteboard p={[w / 2 - 0.13, 1.95, -0.5]} rot={-Math.PI / 2} w={2.0} />
      <WallClock p={[-w / 2 + 0.13, 2.65, 1.0]} rot={Math.PI / 2} />
    </>
  );
}

function PantryDecor({ room, layout }: DecorProps) {
  const w = room.width, high = !room.cutBack;
  return (
    <>
      <KitchenRun p={[-1.4, 0, -3.0]} w={3.4} uppers={high} />
      <CoffeeMachine p={[-2.2, 1.08, -3.0]} />
      <Microwave p={[-0.5, 1.08, -3.0]} />
      <Fridge p={[1.15, 0, -2.9]} />
      <WaterCooler p={[2.35, 0, -3.0]} />
      <RoundTable p={[2.3, 0, 0.2]} r={0.7} />
      {layout.spots.seats.filter(s => s.roomId === room.id).map((s, i) => <Stool key={i} p={[s.x - room.cx, 0, s.z - room.cz]} c={i ? '--scene-fabric-1' : '--scene-fabric-2'} />)}
      <Plant p={[-w / 2 + 0.55, 0, 0.9]} s={1.0} seed={4} />
      <Bin p={[w / 2 - 0.5, 0, -2.4]} />
      <Poster p={[w / 2 - 0.13, 2.0, -1.0]} rot={-Math.PI / 2} i={2} w={1.1} h={1.4} />
      <WallClock p={[-w / 2 + 0.13, 2.3, -0.2]} rot={Math.PI / 2} />
    </>
  );
}

function MeetingDecor({ room, layout }: DecorProps) {
  const w = room.width, high = !room.cutBack, wide = w > 9;
  const L = wide ? 6.4 : 3.6;
  const meet = useMemo(() => tex.screen('rapat'), []);
  const seats = layout.spots.seats.filter(s => s.roomId === room.id);
  return (
    <>
      <ConfTable p={[0, 0, 0]} w={L} d={1.5} />
      {seats.map((s, i) => <MeetingChair key={i} p={[s.x - room.cx, 0, s.z - room.cz]} rot={s.face + Math.PI} c={['--scene-fabric-3', '--scene-fabric-1', '--scene-fabric-2'][i % 3]} />)}
      <B s={[3.4, 0.8, 0.5]} p={[0, 0.4, -3.1]} m={mt('--scene-wood-dark', { rough: 0.6 })} />
      {high ? <WallScreen p={[0, 2.1, -3.37]} w={wide ? 4.4 : 3.2} h={wide ? 2.2 : 1.7} map={meet} /> : <StandScreen p={[0, 0, -3.0]} w={3.0} h={1.5} map={meet} />}
      <Whiteboard p={[w / 2 - 0.13, 1.95, -0.3]} rot={-Math.PI / 2} w={2.4} />
      <Poster p={[-w / 2 + 0.13, 1.95, -0.5]} rot={Math.PI / 2} i={1} />
      <Plant p={[-w / 2 + 0.6, 0, -2.95]} s={1.2} seed={6} />
      <Plant p={[w / 2 - 0.6, 0, -2.95]} s={1.2} seed={7} />
    </>
  );
}

/** Lobi dibiarkan lapang: sofa dan tanaman hanya di tepi, jalan tengah bebas. */
function LobbyDecor({ room }: DecorProps) {
  const w = room.width, high = !room.cutBack;
  return (
    <>
      <Rug p={[0, 0.05, -1.2]} w={4.4} d={2.2} />
      <Sofa p={[0, 0, -2.85]} w={3.2} />
      <Plant p={[-w / 2 + 0.6, 0, -2.9]} s={1.3} seed={9} />
      <Plant p={[w / 2 - 0.6, 0, -2.9]} s={1.3} seed={10} />
      <FloorLamp p={[-2.4, 0, -3.0]} />
      <FloorLamp p={[2.4, 0, -3.0]} />
      {high && <Poster p={[-0.95, 2.1, -3.37]} i={0} w={0.9} h={1.2} />}
      {high && <Poster p={[0.95, 2.1, -3.37]} i={2} w={0.9} h={1.2} />}
      <WallClock p={[w / 2 - 0.13, 2.4, 0.4]} rot={-Math.PI / 2} />
    </>
  );
}

function AulaDecor({ room, layout }: DecorProps) {
  const w = room.width, high = !room.cutBack;
  const screen = useMemo(() => tex.screen('aula'), []);
  const seats = layout.spots.view.filter(s => s.roomId === room.id);
  return (
    <>
      <Stage p={[0, 0, -2.55]} w={w - 1.2} d={1.7} />
      <Podium p={[w / 2 - 2.2, 0.35, -2.5]} rot={0} />
      {high ? <WallScreen p={[0, 2.3, -3.37]} w={Math.min(8, w - 4)} h={2.4} map={screen} /> : <StandScreen p={[0, 0.35, -3.0]} w={Math.min(7, w - 5)} h={1.8} map={screen} />}
      {high && <Curtain p={[-w / 2 + 1.0, 0, -3.3]} w={1.4} h={3.0} />}
      {high && <Curtain p={[w / 2 - 1.0, 0, -3.3]} w={1.4} h={3.0} />}
      {seats.map((s, i) => <TheaterChair key={i} p={[s.x - room.cx, 0, s.z - room.cz]} rot={s.face + Math.PI} />)}
      <Plant p={[-w / 2 + 0.6, 0, 2.7]} s={1.1} seed={12} />
      <Plant p={[w / 2 - 0.6, 0, 2.7]} s={1.1} seed={13} />
    </>
  );
}

function DiscussDecor({ room, layout }: DecorProps) {
  const w = room.width;
  const seats = layout.spots.seats.filter(s => s.roomId === room.id);
  return (
    <>
      {[-2.2, 2.2].map(x => <RoundTable key={x} p={[x, 0, -0.25]} r={0.85} />)}
      {seats.map((s, i) => <MeetingChair key={i} p={[s.x - room.cx, 0, s.z - room.cz]} rot={s.face + Math.PI} c={['--scene-fabric-2', '--scene-fabric-1', '--scene-fabric-3'][i % 3]} />)}
      <Whiteboard p={[w / 2 - 0.13, 1.95, -0.4]} rot={-Math.PI / 2} w={2.2} />
      <Poster p={[-w / 2 + 0.13, 1.95, -0.4]} rot={Math.PI / 2} i={3} />
      <Plant p={[-w / 2 + 0.6, 0, -2.9]} s={1.2} seed={14} />
      <Plant p={[w / 2 - 0.6, 0, -2.9]} s={1.2} seed={15} />
      <Partition p={[0, 0, -2.6]} len={2.2} h={1.2} rot={Math.PI / 2} />
    </>
  );
}

function floorMat(room: RoomLayout) {
  const { width: w } = room, d = ROOM_DEPTH;
  switch (room.kind) {
    case 'pantry': return mt(WHITE, { map: tex.tile(w, d), rough: 0.35 });
    case 'rapat': return mt(WHITE, { map: tex.parquet(w, d), rough: 0.5 });
    case 'lobi': return mt(WHITE, { map: tex.marble(w, d), rough: 0.35 });
    case 'aula': return mt(WHITE, { map: tex.theater(w, d), rough: 1 });
    case 'diskusi': return mt(WHITE, { map: tex.parquet(w, d), rough: 0.5 });
    default: return mt(WHITE, { map: tex.carpet(w, d), rough: 1, bump: tex.bump(w, d), bumpScale: 0.6 });
  }
}

function Room({ room, layout, index, active }: DecorProps & { active: boolean }) {
  const w = room.width, d = ROOM_DEPTH, trim = mt('--scene-trim', { rough: 0.5 });
  const accent = mt(WHITE, { map: tex.wallAccent(w, 1.0), rough: 0.9 });
  const accentSide = mt(WHITE, { map: tex.wallAccent(d, 1.0), rough: 0.9 });
  const backH = room.cutBack ? LOW_WALL_H - 0.1 : 1.0;
  return (
    <group position={[room.cx, 0, room.cz]}>
      <B s={[w - 0.1, 0.04, d - 0.1]} p={[0, 0.02, 0]} m={floorMat(room)} shadow={false} />
      <B s={[w - 0.2, backH, 0.03]} p={[0, backH / 2, -d / 2 + 0.115]} m={accent} shadow={false} />
      <B s={[0.03, 1.0, d - 0.2]} p={[-w / 2 + 0.115, 0.5, 0]} m={accentSide} shadow={false} />
      <B s={[0.03, 1.0, d - 0.2]} p={[w / 2 - 0.115, 0.5, 0]} m={accentSide} shadow={false} />
      <B s={[w - 0.2, 0.05, 0.06]} p={[0, backH + 0.03, -d / 2 + 0.12]} m={trim} shadow={false} />
      <B s={[w - 0.2, 0.14, 0.06]} p={[0, 0.1, -d / 2 + 0.13]} m={trim} shadow={false} />
      {room.kind === 'kerja' && <WorkDecor room={room} layout={layout} index={index} />}
      {room.kind === 'pantry' && <PantryDecor room={room} layout={layout} index={index} />}
      {room.kind === 'rapat' && <MeetingDecor room={room} layout={layout} index={index} />}
      {room.kind === 'lobi' && <LobbyDecor room={room} layout={layout} index={index} />}
      {room.kind === 'aula' && <AulaDecor room={room} layout={layout} index={index} />}
      {room.kind === 'diskusi' && <DiscussDecor room={room} layout={layout} index={index} />}
      <pointLight position={[0, 2.9, -0.3]} intensity={active ? (room.kind === 'aula' ? 12 : 8) : 0} distance={14} decay={2} color="#ffe9c4" />
    </group>
  );
}

/* ---------- dinding, pintu ---------- */
function WallView({ wall, layout }: { wall: Wall; layout: Layout }) {
  const [x0, z0, x1, z1] = wall.rect;
  const sx = x1 - x0, sz = z1 - z0, h = wall.low ? LOW_WALL_H : WALL_H;
  const len = Math.max(sx, sz);
  const m = mt(WHITE, { map: tex.wall(len, h), rough: 0.95 });
  const windows = wall.side === 'edge' && len > 3 && sx > sz;
  return (
    <group>
      <B s={[sx, h, sz]} p={[(x0 + x1) / 2, h / 2, (z0 + z1) / 2]} m={m} />
      {wall.low && <B s={[sx + (sx > sz ? 0 : 0.1), 0.07, sz + (sx > sz ? 0.1 : 0)]} p={[(x0 + x1) / 2, h + 0.035, (z0 + z1) / 2]} m={mt('--scene-trim', { rough: 0.5 })} shadow={false} />}
      {windows && Array.from({ length: Math.floor(len / 4) }, (_, i) => (
        <WindowBand key={i} p={[x0 + 2 + i * 4, 2.3, z1 + 0.02]} w={2.4} h={1.2} />
      ))}
      {wall.side === 'edge' && sz > sx && layout.floors > 0 && Array.from({ length: Math.floor(sz / 5) }, (_, i) => (
        <group key={i} position={[x0 === layout.bounds.x0 - 0.1 ? x1 + 0.02 : x0 - 0.02, 0, z0 + 2.5 + i * 5]} rotation-y={x0 === layout.bounds.x0 - 0.1 ? Math.PI / 2 : -Math.PI / 2}>
          <WindowBand p={[0, 2.3, 0]} w={2.4} h={1.2} />
        </group>
      ))}
    </group>
  );
}

function DoorView({ door, room }: { door: Door; room?: RoomLayout }) {
  const trim = mt('--scene-trim', { rough: 0.5 }), wood = mt('--scene-wood-dark', { rough: 0.55 });
  const w = door.w;
  return (
    <group position={[door.x, 0, door.z]}>
      {[-1, 1].map(s => <B key={s} s={[0.16, 2.55, 0.34]} p={[s * (w / 2 + 0.06), 1.28, 0]} m={trim} />)}
      <B s={[w + 0.45, 0.4, 0.34]} p={[0, 2.72, 0]} m={trim} />
      <Quad w={Math.min(w, 2.1)} h={0.48} p={[0, 2.72, 0.18]} map={labelTex(room?.name ?? '')} />
      <group position={[-w / 2, 0, -0.1]} rotation-y={-1.35}>
        <B s={[0.92, 2.3, 0.07]} p={[0.46, 1.15, 0]} m={wood} />
        <B s={[0.1, 0.1, 0.1]} p={[0.82, 1.1, 0.07]} m={mt('--scene-metal', { metal: 0.8, rough: 0.25 })} shadow={false} />
      </group>
    </group>
  );
}

/* ---------- lantai, tangga, kolom ---------- */
function subtract(r: Rect, h?: Rect): Rect[] {
  if (!h) return [r];
  const [x0, z0, x1, z1] = r, [hx0, hz0, hx1, hz1] = h;
  return ([[x0, z0, hx0, z1], [hx1, z0, x1, z1], [hx0, z0, hx1, hz0], [hx0, hz1, hx1, z1]] as Rect[]).filter(p => p[2] - p[0] > 0.01 && p[3] - p[1] > 0.01);
}

function Slab({ layout, f }: { layout: Layout; f: number }) {
  const b = layout.bounds;
  const hole = layout.holes.find(h => h.floor === f)?.rect;
  const pieces = subtract([b.x0, b.z0, b.x1, b.z1], hole);
  return (
    <>
      {pieces.map((p, i) => (
        <B key={i} s={[p[2] - p[0], f === 0 ? 0.2 : 0.3, p[3] - p[1]]} p={[(p[0] + p[2]) / 2, f === 0 ? -0.1 : -0.15, (p[1] + p[3]) / 2]}
          m={mt(WHITE, { map: tex.hall(p[2] - p[0], p[3] - p[1]), rough: 0.4 })} shadow={f > 0} />
      ))}
    </>
  );
}

function Structure({ layout, f, top }: { layout: Layout; f: number; top: boolean }) {
  const b = layout.bounds;
  const glass = mt('--scene-glass', { rough: 0.1, metal: 0.2, opacity: 0.35 });
  const metal = mt('--scene-metal', { metal: 0.7, rough: 0.3 });
  const span = b.x1 - b.x0, n = Math.max(2, Math.ceil(span / 8));
  const colH = top ? WALL_H : FLOOR_H - 0.1;
  const hole = layout.holes.find(h => h.floor === f)?.rect;
  return (
    <>
      {Array.from({ length: n + 1 }, (_, i) => <Column key={i} p={[b.x0 + 0.3 + (i * (span - 0.6)) / n, f === 0 ? -0.2 : 0, b.z1 - 0.3]} h={colH + (f === 0 ? 0.2 : 0)} />)}
      {f > 0 && (
        <>
          <B s={[span, 0.9, 0.05]} p={[(b.x0 + b.x1) / 2, 0.5, b.z1 - 0.1]} m={glass} shadow={false} />
          <B s={[span, 0.06, 0.1]} p={[(b.x0 + b.x1) / 2, 1.0, b.z1 - 0.1]} m={metal} shadow={false} />
        </>
      )}
      {hole && (
        <>
          {[hole[1], hole[3]].map(z => <B key={z} s={[hole[2] - hole[0], 0.08, 0.06]} p={[(hole[0] + hole[2]) / 2, 1.0, z]} m={metal} shadow={false} />)}
          {[hole[0], hole[2]].map(x => <B key={x} s={[0.06, 0.08, hole[3] - hole[1]]} p={[x, 1.0, (hole[1] + hole[3]) / 2]} m={metal} shadow={false} />)}
          {[hole[0], hole[2]].map(x => <B key={`g${x}`} s={[0.04, 0.9, hole[3] - hole[1]]} p={[x, 0.5, (hole[1] + hole[3]) / 2]} m={glass} shadow={false} />)}
          <B s={[hole[2] - hole[0], 0.9, 0.04]} p={[(hole[0] + hole[2]) / 2, 0.5, hole[1]]} m={glass} shadow={false} />
        </>
      )}
    </>
  );
}

function Stairs({ stair }: { stair: Stair }) {
  const steps = 13, rise = (stair.y1 - stair.y0) / steps, run = (stair.zb - stair.zt) / steps;
  const wood = mt('--scene-wood', { rough: 0.6 }), metal = mt('--scene-metal', { metal: 0.7, rough: 0.3 }), dark = mt('--scene-metal-dark', { metal: 0.5 });
  const L = Math.hypot(stair.zb - stair.zt, stair.y1 - stair.y0), ang = Math.atan2(stair.y1 - stair.y0, stair.zb - stair.zt);
  const mid: [number, number] = [(stair.y0 + stair.y1) / 2, (stair.zb + stair.zt) / 2];
  return (
    <group position={[stair.lx, 0, 0]}>
      {Array.from({ length: steps }, (_, i) => <B key={i} s={[1.5, 0.14, run + 0.02]} p={[0, stair.y0 + (i + 1) * rise - 0.07, stair.zb - (i + 0.5) * run]} m={wood} />)}
      {[-0.78, 0.78].map(x => (
        <group key={x}>
          <B s={[0.08, 0.5, L]} p={[x, mid[0] - 0.25, mid[1]]} r={[ang, 0, 0]} m={dark} />
          <B s={[0.06, 0.06, L]} p={[x, mid[0] + 1.0, mid[1]]} r={[ang, 0, 0]} m={metal} shadow={false} />
        </group>
      ))}
    </group>
  );
}

/* ---------- bangunan ---------- */
export function Building({ layout }: { layout: Layout }) {
  const viewFloor = useStore(s => s.viewFloor);
  const b = layout.bounds;
  const floors = Array.from({ length: Math.min(layout.floors, viewFloor + 1) }, (_, f) => f);
  const kindCount: Record<string, number> = {};
  const planters = Math.max(2, Math.floor((b.x1 - b.x0) / 9));
  return (
    <>
      <B s={[b.x1 - b.x0 + 1.2, 0.7, b.z1 - b.z0 + 1.2]} p={[(b.x0 + b.x1) / 2, -0.65, (b.z0 + b.z1) / 2]} m={mt('--scene-metal-dark', { rough: 0.8 })} shadow={false} />
      {floors.map(f => (
        <group key={f} position={[0, floorY(f), 0]}>
          <Slab layout={layout} f={f} />
          <Structure layout={layout} f={f} top={f === layout.floors - 1 || f === viewFloor} />
          {layout.walls.filter(w => w.floor === f).map((w, i) => <WallView key={i} wall={w} layout={layout} />)}
          {layout.doors.filter(d => d.floor === f).map(d => <DoorView key={d.roomId} door={d} room={layout.rooms.find(r => r.id === d.roomId)} />)}
          {layout.rooms.filter(r => r.floor === f).map((r, i) => {
            kindCount[r.kind] = (kindCount[r.kind] ?? -1) + 1;
            return <Room key={r.id} room={r} layout={layout} index={r.kind === 'kerja' ? kindCount.kerja : i} active />;
          })}
          {/* lobi utama: tanaman di tepi saja, jalur tengah bebas */}
          {Array.from({ length: planters }, (_, i) => (
            <Planter key={i} p={[b.x0 + 4 + (i * (b.x1 - b.x0 - 8)) / Math.max(1, planters - 1), 0, b.z1 - 0.75]} w={2.0} seed={i + f} />
          ))}
        </group>
      ))}
      {layout.stairs.filter(s => s.floor <= viewFloor).map(s => (
        <group key={s.floor}>
          <Stairs stair={s} />
        </group>
      ))}
    </>
  );
}

export { DOOR_W };
