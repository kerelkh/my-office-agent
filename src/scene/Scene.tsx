import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Agent } from './Agent';
import { Building } from './Building';
import { Npc } from './Npc';
import { Outdoors } from './Outdoors';
import { token } from '../colors';
import { FLOOR_H, computeLayout, type Layout } from '../layout';
import { useStore } from '../store';

function Confetti() {
  const group = useRef<THREE.Group>(null!);
  const bits = useRef<{ m: THREE.Mesh; v: THREE.Vector3 }[]>([]);
  const n = useStore(s => s.confetti);
  const palette = useMemo(() => ['--color-accent', '--color-cool', '--color-ok', '--scene-white'].map(token), []);
  useEffect(() => {
    if (!n) return;
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: palette[i % palette.length] }));
      m.position.set((Math.random() - 0.5) * 4, 5, 1);
      group.current.add(m);
      bits.current.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 8 + 3, (Math.random() - 0.5) * 6) });
    }
  }, [n, palette]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    bits.current = bits.current.filter(b => {
      b.v.y -= 14 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 6; b.m.rotation.y += dt * 4;
      if (b.m.position.y < 0.07) { group.current.remove(b.m); b.m.geometry.dispose(); (b.m.material as THREE.Material).dispose(); return false; }
      return true;
    });
  });
  return <group ref={group} />;
}

/** Kamera bebas ala simulasi: seret = geser, klik kanan = putar, roda = zoom, WASD/panah = jalan, Q/E = putar, R = ulang, klik karyawan di dok = fokus. */
function CameraRig({ layout }: { layout: Layout }) {
  const camera = useThree(s => s.camera);
  const controls = useThree(s => s.controls) as OrbitControlsImpl | null;
  const size = useThree(s => s.size);
  const keys = useRef(new Set<string>());
  const tween = useRef<{ to: THREE.Vector3; dist: number; t: number } | null>(null);
  const layoutRef = useRef(layout); layoutRef.current = layout;
  const placed = useRef(false);

  const reset = (c: OrbitControlsImpl) => {
    const L = layoutRef.current, b = L.bounds;
    const cx = (b.x0 + b.x1) / 2, w = b.x1 - b.x0;
    const aspect = size.width / Math.max(1, size.height);
    const dist = Math.max(24, w * 0.62 + 12) * Math.max(1, 1.6 / aspect);   // layar sempit perlu mundur lebih jauh
    const cz = (b.z0 + b.z1) / 2;
    c.target.set(cx, 1, cz);
    camera.position.set(cx, dist * 0.62, cz + dist * 0.8);
    c.update();
  };

  useEffect(() => { if (controls && !placed.current) { placed.current = true; reset(controls); } }, [controls]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (import.meta.env.DEV) Object.assign(window, { __rig: { camera, controls } }); }, [camera, controls]);
  useEffect(() => {
    const typing = () => /input|textarea|select/i.test(document.activeElement?.tagName ?? '');
    const down = (e: KeyboardEvent) => {
      if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'r' && controls) reset(controls);
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.current.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    const onReset = () => controls && reset(controls);
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur); addEventListener('office:resetcam', onReset);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); removeEventListener('office:resetcam', onReset); };
  }, [controls]); // eslint-disable-line react-hooks/exhaustive-deps

  // fokus ke karyawan atau ganti lantai: geser target dengan mulus
  const focus = useStore(s => s.cameraFocus);
  const viewFloor = useStore(s => s.viewFloor);
  useEffect(() => {
    if (!controls || !focus) return;
    tween.current = { to: new THREE.Vector3(focus.x, focus.y + 1, focus.z), dist: 18, t: 0 };
  }, [focus?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!controls) return;
    const to = controls.target.clone(); to.y = viewFloor * FLOOR_H + 1;
    tween.current = { to, dist: camera.position.distanceTo(controls.target), t: 0 };
  }, [viewFloor]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dtRaw) => {
    if (!controls) return;
    const dt = Math.min(dtRaw, 0.05);
    const L = layoutRef.current, b = L.bounds;
    const dist = camera.position.distanceTo(controls.target);

    if (keys.current.size) {
      const fast = keys.current.has('shift') ? 2.2 : 1;
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const v = new THREE.Vector3();
      const k = keys.current;
      if (k.has('w') || k.has('arrowup')) v.add(f);
      if (k.has('s') || k.has('arrowdown')) v.sub(f);
      if (k.has('d') || k.has('arrowright')) v.add(r);
      if (k.has('a') || k.has('arrowleft')) v.sub(r);
      if (v.lengthSq()) { v.normalize().multiplyScalar(Math.max(8, dist * 0.9) * fast * dt); controls.target.add(v); camera.position.add(v); }
      const rot = (k.has('q') ? 1 : 0) - (k.has('e') ? 1 : 0);
      if (rot) {
        const off = camera.position.clone().sub(controls.target);
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot * dt * 1.4);
        camera.position.copy(controls.target).add(off);
      }
      tween.current = null;
    }

    if (tween.current) {
      const tw = tween.current; tw.t = Math.min(1, tw.t + dt * 1.6);
      const e = 1 - Math.pow(1 - tw.t, 3);
      const before = controls.target.clone();
      controls.target.lerp(tw.to, e * 0.18 + 0.02);
      camera.position.add(controls.target.clone().sub(before));
      const off = camera.position.clone().sub(controls.target);
      const d = off.length();
      if (tw.dist < d - 0.5 && tw.dist < 30) off.setLength(d + (tw.dist - d) * 0.06);
      camera.position.copy(controls.target).add(off);
      if (tw.t >= 1) tween.current = null;
    }

    // jaga agar kamera tidak keluar terlalu jauh dari bangunan
    const t = controls.target;
    const cl = new THREE.Vector3(
      Math.min(b.x1 + 30, Math.max(b.x0 - 30, t.x)), Math.min(L.floors * FLOOR_H, Math.max(0, t.y)), Math.min(b.z1 + 30, Math.max(b.z0 - 12, t.z)));
    if (!cl.equals(t)) { camera.position.add(cl.clone().sub(t)); t.copy(cl); }
  });
  return null;
}

function World() {
  const ws = useStore(s => s.ws);
  const layout = useMemo(() => computeLayout(ws), [ws]);
  const b = layout.bounds;
  const half = (b.x1 - b.x0) / 2 + 14;
  const cx = (b.x0 + b.x1) / 2;
  return (
    <>
      <color attach="background" args={[token('--scene-sky-bottom')]} />
      <fog attach="fog" args={[token('--scene-sky-bottom'), 140, 380]} />
      <hemisphereLight args={[token('--scene-sky-bottom'), token('--scene-grass-2'), 1.15]} />
      <directionalLight position={[cx + half * 0.5, 40, 26]} intensity={2.6} color="#fff1dc" castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-half} shadow-camera-right={half} shadow-camera-top={34} shadow-camera-bottom={-30} shadow-camera-near={1} shadow-camera-far={150} />
      <Environment resolution={256} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} position={[0, 9, 8]} rotation-x={Math.PI / 2} scale={[40, 14, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-18, 5, 2]} rotation-y={Math.PI / 2} scale={[16, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[18, 5, 2]} rotation-y={-Math.PI / 2} scale={[16, 8, 1]} />
      </Environment>
      <Outdoors layout={layout} />
      <Building layout={layout} />
      {ws.roles.map((r, i) => layout.desks[r.id] && <Agent key={r.id} role={r} index={i} desk={layout.desks[r.id]} layout={layout} />)}
      {Array.from({ length: ws.npcCount }, (_, i) => <Npc key={i} index={i} layout={layout} />)}
      <Confetti />
      <CameraRig layout={layout} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} enablePan screenSpacePanning={false} zoomToCursor minDistance={4} maxDistance={140}
        minPolarAngle={0.2} maxPolarAngle={1.5} panSpeed={1.1} rotateSpeed={0.7}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }} />
    </>
  );
}

export function Scene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: 900 }} aria-label="Kantor 3D. Seret untuk menggeser, klik kanan untuk memutar, roda untuk zoom, WASD untuk berjalan"
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} onContextMenu={e => e.preventDefault()}>
      <Suspense fallback={null}><World /></Suspense>
    </Canvas>
  );
}
