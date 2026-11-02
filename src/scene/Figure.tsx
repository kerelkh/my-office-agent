import type { RefObject } from 'react';
import * as THREE from 'three';
import { token } from '../colors';
import type { Pose } from '../types';

/** Tubuh karakter bersama untuk karyawan dan NPC, beserta penerap pose. */
export interface FigureRefs {
  legL: RefObject<THREE.Group>; legR: RefObject<THREE.Group>; armL: RefObject<THREE.Group>; armR: RefObject<THREE.Group>;
  head: RefObject<THREE.Group>; torso: RefObject<THREE.Group>; paper: RefObject<THREE.Group>; cup: RefObject<THREE.Mesh>;
}

export interface Look {
  body: THREE.Color; skin: THREE.Color; hair: THREE.Color; pants: THREE.Color; shoe: THREE.Color; white: THREE.Color; dark: THREE.Color; tie: THREE.Color;
  style: number; glasses: boolean; tieOn: boolean;
}

export function makeLook(index: number, bodyToken: string): Look {
  return {
    body: token(bodyToken), skin: token(`--scene-skin-${[1, 3, 2, 4][index % 4]}`), hair: token(`--scene-hair-${(index * 2 + (index % 3)) % 5 + 1}`),
    pants: token(index % 2 ? '--scene-pants' : '--scene-pants-2'), shoe: token('--scene-shoe'), white: token('--scene-white'), dark: token('--scene-black'), tie: token('--color-accent'),
    style: index % 4, glasses: index % 2 === 1, tieOn: index % 3 === 0,
  };
}

export interface PoseInput { moving: boolean; sit: number; carrying: boolean; working: boolean; pose: Pose; seed: number }

export const SEAT_DROP = 0.42;

/** Menerapkan pose ke sendi-sendi karakter; pemanggil mengatur posisi dan tinggi badan. */
export function applyPose(r: FigureRefs, p: PoseInput, dt: number, t: number) {
  const swing = p.moving ? Math.sin(t * 10) : 0;
  const sit = p.sit;
  r.legL.current!.rotation.x = swing * 0.7 * (1 - sit) - 1.4 * sit;
  r.legR.current!.rotation.x = -swing * 0.7 * (1 - sit) - 1.4 * sit;
  let aL = -swing * 0.7, aR = swing * 0.7, headX = Math.sin(t * 1.5 + p.seed) * 0.03, headY = 0;
  if (p.carrying) aL = aR = -1.2;
  else if (p.working) { aL = -1.3 + Math.sin(t * 22) * 0.1; aR = -1.3 + Math.sin(t * 22 + 2) * 0.1; headX = 0.18; }
  else if (p.pose === 'drink') { aR = -2.0 + Math.sin(t * 2) * 0.08; headX = -0.1; }
  else if (p.pose === 'read') { aL = aR = -1.1; headX = 0.4; }
  else if (p.pose === 'stretch') { aL = aR = -2.9 + Math.sin(t * 3) * 0.15; headX = -0.15; }
  else if (p.pose === 'talk') { aR = -0.9 + Math.sin(t * 7) * 0.5; aL = Math.sin(t * 5) * 0.15; headX = Math.sin(t * 6) * 0.08; }
  else if (p.pose === 'look') { headY = Math.sin(t * 1.1) * 0.8; }
  else if (sit > 0.5) { aL = -1.05; aR = -1.05 + Math.sin(t * 0.8 + p.seed) * 0.04; }
  const k = Math.min(1, dt * 14);
  r.armL.current!.rotation.x += (aL - r.armL.current!.rotation.x) * k;
  r.armR.current!.rotation.x += (aR - r.armR.current!.rotation.x) * k;
  r.head.current!.rotation.x += (headX - r.head.current!.rotation.x) * k;
  r.head.current!.rotation.y += (headY - r.head.current!.rotation.y) * k;
  r.torso.current!.scale.y = p.moving || p.working ? 1 : 1 + Math.sin(t * 2 + p.seed) * 0.015;
  r.paper.current!.visible = p.carrying || p.pose === 'read';
  r.cup.current!.visible = p.pose === 'drink';
}

type V3 = [number, number, number];
const Box = ({ size, color, pos = [0, 0, 0], rot }: { size: V3; color: THREE.Color; pos?: V3; rot?: V3 }) => (
  <mesh position={pos} rotation={rot} castShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.85} />
  </mesh>
);

export function Figure({ look, refs }: { look: Look; refs: FigureRefs }) {
  const { body, skin, hair, pants, shoe, white, dark, style } = look;
  return (
    <>
      <group ref={refs.legL} position={[-0.2, 0.9, 0]}>
        <Box size={[0.32, 0.8, 0.36]} color={pants} pos={[0, -0.4, 0]} />
        <Box size={[0.34, 0.14, 0.52]} color={shoe} pos={[0, -0.84, 0.08]} />
      </group>
      <group ref={refs.legR} position={[0.2, 0.9, 0]}>
        <Box size={[0.32, 0.8, 0.36]} color={pants} pos={[0, -0.4, 0]} />
        <Box size={[0.34, 0.14, 0.52]} color={shoe} pos={[0, -0.84, 0.08]} />
      </group>

      <group ref={refs.torso}>
        <Box size={[0.9, 1.0, 0.5]} color={body} pos={[0, 1.4, 0]} />
        <Box size={[0.94, 0.09, 0.54]} color={dark} pos={[0, 0.93, 0]} />
        <Box size={[0.5, 0.1, 0.3]} color={white} pos={[0, 1.9, 0.02]} />
        {look.tieOn && <Box size={[0.1, 0.55, 0.04]} color={look.tie} pos={[0, 1.58, 0.27]} />}
        <Box size={[0.14, 0.2, 0.03]} color={white} pos={[-0.26, 1.62, 0.27]} />
      </group>

      {([['L', -0.6, refs.armL], ['R', 0.6, refs.armR]] as const).map(([k, x, ref]) => (
        <group key={k} ref={ref} position={[x, 1.85, 0]}>
          <Box size={[0.28, 0.5, 0.28]} color={body} pos={[0, -0.25, 0]} />
          <Box size={[0.24, 0.42, 0.24]} color={skin} pos={[0, -0.7, 0]} />
          <Box size={[0.26, 0.2, 0.26]} color={skin} pos={[0, -0.95, 0]} />
          {k === 'R' && (
            <mesh ref={refs.cup} position={[0, -1.05, 0.2]} visible={false} castShadow>
              <boxGeometry args={[0.2, 0.26, 0.2]} /><meshStandardMaterial color={white} roughness={0.6} />
            </mesh>
          )}
        </group>
      ))}

      <group ref={refs.head} position={[0, 2.3, 0]}>
        <Box size={[0.7, 0.7, 0.7]} color={skin} />
        <Box size={[0.08, 0.1, 0.06]} color={skin} pos={[0, -0.02, 0.37]} />
        <Box size={[0.76, 0.26, 0.78]} color={hair} pos={[0, 0.42, -0.01]} />
        <Box size={[0.76, 0.5, 0.14]} color={hair} pos={[0, 0.1, -0.34]} />
        {style === 1 && <Box size={[0.76, 0.2, 0.2]} color={hair} pos={[0, 0.3, 0.3]} rot={[0.2, 0, 0.12]} />}
        {style === 2 && <mesh position={[0, 0.66, -0.2]} castShadow><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>}
        {style === 3 && (
          <>
            <Box size={[0.78, 0.95, 0.14]} color={hair} pos={[0, -0.12, -0.34]} />
            <Box size={[0.1, 0.55, 0.6]} color={hair} pos={[-0.38, 0.0, -0.05]} />
            <Box size={[0.1, 0.55, 0.6]} color={hair} pos={[0.38, 0.0, -0.05]} />
          </>
        )}
        {[-0.17, 0.17].map(x => (
          <group key={x}>
            <Box size={[0.15, 0.13, 0.03]} color={white} pos={[x, 0.06, 0.36]} />
            <Box size={[0.07, 0.1, 0.03]} color={dark} pos={[x, 0.06, 0.375]} />
            <Box size={[0.17, 0.04, 0.03]} color={hair} pos={[x, 0.2, 0.365]} />
          </group>
        ))}
        <Box size={[0.2, 0.04, 0.03]} color={token('--scene-wood-dark')} pos={[0, -0.18, 0.365]} />
        {look.glasses && (
          <group>
            {[-0.17, 0.17].map(x => (
              <group key={x}>
                <Box size={[0.22, 0.03, 0.03]} color={dark} pos={[x, 0.14, 0.39]} /><Box size={[0.22, 0.03, 0.03]} color={dark} pos={[x, -0.02, 0.39]} />
                <Box size={[0.03, 0.17, 0.03]} color={dark} pos={[x - 0.1, 0.06, 0.39]} /><Box size={[0.03, 0.17, 0.03]} color={dark} pos={[x + 0.1, 0.06, 0.39]} />
              </group>
            ))}
            <Box size={[0.1, 0.03, 0.03]} color={dark} pos={[0, 0.1, 0.39]} />
          </group>
        )}
      </group>

      <group ref={refs.paper} position={[0, 1.3, 0.7]} visible={false}>
        <Box size={[0.55, 0.04, 0.7]} color={white} />
        <Box size={[0.55, 0.05, 0.12]} color={body} pos={[0, 0.04, -0.29]} />
      </group>
    </>
  );
}
