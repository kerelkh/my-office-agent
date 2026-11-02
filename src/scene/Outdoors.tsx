import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { token } from '../colors';
import type { Layout } from '../layout';
import { B, Bench, Car, Cy, RoundTable, Stool, StreetLamp, Tree, mt } from './props';
import { tex } from './textures';

const WHITE = '#ffffff';
const GROUND_Y = -0.05;

/** Langit berupa kubah bergradasi. */
function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: token('--scene-sky-top') }, bottom: { value: token('--scene-sky-bottom') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.4 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0);\n#include <colorspace_fragment>\n}',
  }), []);
  return <mesh material={mat}><sphereGeometry args={[420, 24, 16]} /></mesh>;
}

function Cars({ z, span }: { z: number; span: number }) {
  const group = useRef<THREE.Group>(null!);
  const cars = useMemo(() => [
    { x: -span * 0.3, v: 6.5, c: '--scene-car-1', lane: 0 }, { x: span * 0.2, v: 5, c: '--scene-car-2', lane: 0 },
    { x: span * 0.4, v: -5.5, c: '--scene-car-3', lane: 1 }, { x: -span * 0.1, v: -7, c: '--scene-car-1', lane: 1 },
  ], [span]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    group.current.children.forEach((g, i) => {
      const c = cars[i];
      c.x += c.v * dt;
      if (c.x > span) c.x = -span; if (c.x < -span) c.x = span;
      g.position.set(c.x, GROUND_Y + 0.1, z + (c.lane ? -1.9 : 1.9));
      g.rotation.y = c.v > 0 ? 0 : Math.PI;
    });
  });
  return <group ref={group}>{cars.map((c, i) => <group key={i}><Car c={c.c} /></group>)}</group>;
}

function Clouds() {
  const group = useRef<THREE.Group>(null!);
  const items = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: (i - 4) * 70 + (i % 3) * 20, y: 90 + (i % 4) * 14, z: -120 + (i % 5) * 40, s: 1 + (i % 3) * 0.5 })), []);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: token('--scene-white'), transparent: true, opacity: 0.85, fog: false }), []);
  useFrame((_, dt) => { group.current.children.forEach(c => { c.position.x += dt * 1.6; if (c.position.x > 320) c.position.x = -320; }); });
  return (
    <group ref={group}>
      {items.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[[0, 0, 0, 14], [11, -1, 3, 10], [-11, -1, -2, 11], [4, 3, -4, 9]].map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]} scale={[1, 0.55, 1]} material={m}><sphereGeometry args={[r, 12, 8]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Air mancur di tengah plaza dengan semburan yang naik turun. */
function Fountain({ x, z, r }: { x: number; z: number; r: number }) {
  const jet = useRef<THREE.Mesh>(null!);
  useFrame(s => { jet.current.scale.y = 1 + Math.sin(s.clock.elapsedTime * 2.2) * 0.25; });
  const stone = mt('--scene-concrete', { rough: 0.8, map: tex.concrete(r, r) });
  return (
    <group position={[x, GROUND_Y, z]}>
      <Cy r={r} h={0.55} p={[0, 0.27, 0]} m={stone} seg={32} />
      <Cy r={r - 0.25} h={0.06} p={[0, 0.55, 0]} m={mt('--color-cool', { rough: 0.1, metal: 0.2, opacity: 0.7 })} seg={32} shadow={false} />
      <Cy r={0.35} h={1.1} p={[0, 0.8, 0]} m={stone} seg={16} />
      <Cy r={0.9} rb={0.5} h={0.25} p={[0, 1.4, 0]} m={stone} seg={20} />
      <mesh ref={jet} position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.07, 0.16, 1.1, 10]} />
        <meshStandardMaterial color={token('--color-cool')} transparent opacity={0.65} roughness={0.1} />
      </mesh>
    </group>
  );
}

/** Kafe terbuka di seberang gedung: konter, kanopi, dan meja bulat. */
function Cafe({ cafe }: { cafe: Layout['outdoor']['cafe'] }) {
  const { x, z, w } = cafe;
  const awning = mt('--scene-curtain', { rough: 0.9 }), wood = mt('--scene-wood-dark', { rough: 0.6 }), metal = mt('--scene-metal-dark', { metal: 0.5, rough: 0.4 });
  return (
    <group position={[x, GROUND_Y, z]}>
      <B s={[w, 1.1, 1.2]} p={[0, 0.55, 0]} m={wood} />
      <B s={[w + 0.2, 0.1, 1.4]} p={[0, 1.15, 0]} m={mt('--scene-marble', { rough: 0.3 })} />
      <B s={[1, 0.5, 0.5]} p={[-w / 4, 1.45, 0]} m={mt('--scene-black', { rough: 0.3, metal: 0.5 })} />
      {[-w / 2 + 0.1, w / 2 - 0.1].map(px => <B key={px} s={[0.12, 3.0, 0.12]} p={[px, 1.5, -0.55]} m={metal} />)}
      <B s={[w + 0.8, 0.14, 4.4]} p={[0, 3.0, 1.2]} r={[0.1, 0, 0]} m={awning} />
      {Array.from({ length: Math.round((w + 0.8) / 0.8) }, (_, i) => <B key={i} s={[0.4, 0.06, 0.2]} p={[-(w + 0.8) / 2 + 0.4 + i * 0.8, 2.82, 3.4]} m={mt('--scene-white', { rough: 0.9 })} shadow={false} />)}
      <B s={[w + 0.8, 0.9, 0.12]} p={[0, 2.55, -0.6]} m={mt('--scene-black', { rough: 0.5 })} />
      {cafe.tables.map(t => (
        <group key={t.x} position={[t.x - x, 0, t.z - z]}>
          <RoundTable p={[0, 0, 0]} r={0.6} />
          <Stool p={[-1.15, 0, 0]} c="--scene-fabric-2" /><Stool p={[1.15, 0, 0]} c="--scene-fabric-1" />
        </group>
      ))}
    </group>
  );
}

/** Halte bus di tepi trotoar. */
function BusStop({ x, z }: { x: number; z: number }) {
  const metal = mt('--scene-metal-dark', { metal: 0.5, rough: 0.4 }), glass = mt('--scene-glass', { rough: 0.1, metal: 0.2, opacity: 0.4 });
  return (
    <group position={[x, GROUND_Y, z]}>
      {[-2.1, 2.1].map(px => <B key={px} s={[0.12, 2.8, 0.12]} p={[px, 1.4, -0.7]} m={metal} />)}
      <B s={[4.6, 0.12, 2.0]} p={[0, 2.85, -0.1]} m={mt('--scene-curtain', { rough: 0.8 })} />
      <B s={[4.2, 2.2, 0.05]} p={[0, 1.5, -0.75]} m={glass} shadow={false} />
      <Bench p={[0, 0, 0.1]} w={3.6} rot={0} />
    </group>
  );
}

/** Dunia di sekitar gedung: halaman, plaza berair mancur, taman, kafe, halte, jalan raya, pohon, lampu jalan, dan siluet kota. */
export function Outdoors({ layout }: { layout: Layout }) {
  const b = layout.bounds, o = layout.outdoor;
  const cx = (b.x0 + b.x1) / 2, W = b.x1 - b.x0;
  const roadZ = o.road;
  const [px0, pz0, px1, pz1] = o.plaza;
  const [lx0, lz0, lx1, lz1] = o.lawn;
  const trees = useMemo(() => {
    const out: { p: [number, number, number]; s: number; seed: number }[] = [];
    let k = 1;
    for (let x = b.x0 - 26; x <= b.x1 + 26; x += 7.5) out.push({ p: [x, GROUND_Y, b.z0 - 8 - (k % 3) * 3], s: 1 + (k % 3) * 0.2, seed: k++ });
    for (let z = b.z0 - 2; z < b.z1 - 1; z += 8) { out.push({ p: [b.x0 - 17 - (k % 2) * 3, GROUND_Y, z], s: 1.1, seed: k++ }); out.push({ p: [b.x1 + 18 + (k % 2) * 3, GROUND_Y, z], s: 1.1, seed: k++ }); }
    o.trees.forEach(t => out.push({ p: [t.x, GROUND_Y, t.z], s: t.s, seed: k++ }));
    return out;
  }, [b.x0, b.x1, b.z0, b.z1, o.trees]);
  const skyline = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2, r = 230 + (i % 5) * 18;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 30 + ((i * 37) % 70), w: 14 + ((i * 13) % 14) };
  }), []);
  return (
    <>
      <SkyDome />
      <Clouds />
      <mesh rotation-x={-Math.PI / 2} position={[cx, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[700, 520]} />
        <meshStandardMaterial map={tex.grass(700, 520)} roughness={1} />
      </mesh>
      {/* plaza, jalur ke kafe dan halte, trotoar */}
      <B s={[px1 - px0, 0.08, pz1 - pz0]} p={[(px0 + px1) / 2, GROUND_Y + 0.04, (pz0 + pz1) / 2]} m={mt(WHITE, { map: tex.paving(px1 - px0, pz1 - pz0), rough: 0.8 })} shadow={false} />
      <B s={[3.2, 0.08, roadZ - pz1 - 5.5]} p={[cx - 14, GROUND_Y + 0.04, (pz1 + roadZ - 5.5) / 2]} m={mt(WHITE, { map: tex.paving(3.2, 12), rough: 0.8 })} shadow={false} />
      <B s={[lx1 - lx0, 0.08, 3.2]} p={[(lx0 + lx1) / 2, GROUND_Y + 0.04, (lz0 + lz1) / 2]} m={mt(WHITE, { map: tex.paving(lx1 - lx0, 3.2), rough: 0.8 })} shadow={false} />
      <B s={[700, 0.08, 5]} p={[cx, GROUND_Y + 0.04, roadZ - 5]} m={mt(WHITE, { map: tex.paving(700, 5), rough: 0.8 })} shadow={false} />
      <B s={[W + 24, 0.08, 7]} p={[b.x0 - 12 + (W + 24) / 2, GROUND_Y + 0.04, o.cafe.z + 1.5]} m={mt(WHITE, { map: tex.paving(W + 24, 7), rough: 0.8 })} shadow={false} />
      <Fountain x={o.fountain.x} z={o.fountain.z} r={o.fountain.r} />
      {o.benches.map((bn, i) => <Bench key={i} p={[bn.x, GROUND_Y, bn.z]} w={2.4} rot={bn.face} />)}
      <Cafe cafe={o.cafe} />
      <BusStop x={o.bus.x} z={o.bus.z} />
      {/* jalan raya dengan marka */}
      <B s={[700, 0.1, 9]} p={[cx, GROUND_Y + 0.05, roadZ + 1]} m={mt(WHITE, { map: tex.asphalt(700, 9), rough: 0.9 })} shadow={false} />
      {Array.from({ length: 60 }, (_, i) => <B key={i} s={[2.2, 0.02, 0.2]} p={[cx - 300 + i * 10, GROUND_Y + 0.11, roadZ + 1]} m={mt('--scene-line', { rough: 0.8 })} shadow={false} />)}
      <Cars z={roadZ + 1} span={180} />
      {Array.from({ length: 10 }, (_, i) => <StreetLamp key={i} p={[cx - 90 + i * 20, GROUND_Y, roadZ - 2.6]} />)}
      {[px0 + 2, px1 - 2].map(lampX => <StreetLamp key={lampX} p={[lampX, GROUND_Y, pz0 + 1.5]} />)}
      {trees.map((t, i) => <Tree key={i} p={t.p} s={t.s} seed={t.seed} />)}
      {skyline.map((s, i) => (
        <mesh key={i} position={[s.x, GROUND_Y + s.h / 2, s.z]}>
          <boxGeometry args={[s.w, s.h, s.w]} />
          <meshStandardMaterial color={token('--scene-skyline')} roughness={1} fog />
        </mesh>
      ))}
    </>
  );
}
