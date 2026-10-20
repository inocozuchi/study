import type { HikerPose } from './rigMath';
import { HIKER } from './rigMath';

/**
 * 関節で分割されたハイカーの SVG リグ（右向き、約 6 頭身）。
 * 原点は股関節の真下の地面。1 単位 ≒ 身長の 1/107。
 *
 * 階層：
 *   hips ─┬ farLeg(thigh → knee → ankle/boot)
 *         ├ torsoBack ─┬ farArm(shoulder → elbow)
 *         │            ├ pack（バウンス）
 *         │            ├ jacket / straps
 *         │            └ head ─ pom
 *         ├ nearLeg(thigh → knee → ankle/boot)
 *         └ torsoFront ─ nearArm(shoulder → elbow → hand/mug)
 */

export type HikerJoint =
  | 'hips' | 'torsoBack' | 'torsoFront' | 'pack' | 'head' | 'pom'
  | 'nearThigh' | 'nearKnee' | 'nearAnkle' | 'farThigh' | 'farKnee' | 'farAnkle'
  | 'nearShoulder' | 'nearElbow' | 'farShoulder' | 'farElbow' | 'mug';

export type HikerRefs = Partial<Record<HikerJoint, SVGGElement | null>>;

const C = {
  skin: '#F0C29E', skinSh: '#D49A78', hair: '#3B2A22',
  hat: '#2F7F6A', hatLt: '#43A285', hatBand: '#22624F', pom: '#F6CF5E', pomLt: '#FBE59A',
  jacket: '#E0562D', jacketLt: '#F47F4C', jacketSh: '#B13F1F', jacketFar: '#A63A1D',
  pants: '#4B3A31', pantsLt: '#644E40', pantsFar: '#382B24',
  boot: '#7B3E2B', bootLt: '#9C5639', bootFar: '#5E2F21', sole: '#2B201B', sock: '#E9E1D1',
  pack: '#F0A537', packLt: '#F9C762', packSh: '#C47E27', strap: '#5A3A26',
  mat: '#3D79CF', matLt: '#68A1EA', matEnd: '#2C5DA5', mug: '#3B3F46',
};

// 関節の配置（親座標系）
export const JOINT = {
  knee: HIKER.thigh,
  ankle: HIKER.shin,
  shoulder: { x: 1.5, y: -27 },
  elbow: 14,
  neck: { x: 1, y: -31 },
};

function Leg({ near, r }: { near: boolean; r: (k: HikerJoint) => (el: SVGGElement | null) => void }) {
  const pants = near ? C.pants : C.pantsFar;
  const boot = near ? C.boot : C.bootFar;
  return (
    <g ref={r(near ? 'nearThigh' : 'farThigh')}>
      <path d="M-5 -3 Q-5.6 12 -4.3 24.5 L4.5 24.5 Q5.7 12 5.1 -3 Z" fill={pants} />
      {near && <path d="M1.6 0 Q2.9 12 2.7 22 L4.3 22 Q5.1 12 4.7 0 Z" fill={C.pantsLt} />}
      <g ref={r(near ? 'nearKnee' : 'farKnee')}>
        <path d="M-4.3 -1.5 L4.5 -1.5 Q4.3 10 3.7 21.5 L-3.5 21.5 Q-4.1 10 -4.3 -1.5 Z" fill={pants} />
        {near && <path d="M1.8 0 Q2.6 10 2.4 19 L3.8 19 Q4.2 10 4.2 0 Z" fill={C.pantsLt} />}
        <rect x="-3.7" y="17.6" width="7.4" height="3.4" rx="1.2" fill={near ? C.sock : '#C9C0B0'} />
        <g ref={r(near ? 'nearAnkle' : 'farAnkle')}>
          <path d="M-4.2 -2.6 L3.8 -2.6 Q4.8 0.4 8.8 1.4 Q11.4 2 11.1 3.4 L-5 3.4 Q-5.5 0.4 -4.2 -2.6 Z" fill={boot} />
          {near && <path d="M0.4 -1.4 L4.6 0.6 M2 -2 L5.6 -0.2" stroke={C.bootLt} strokeWidth="0.8" strokeLinecap="round" />}
          <path d="M-5.2 3 L11.3 3 L11 5 L-5 5 Z" fill={C.sole} />
        </g>
      </g>
    </g>
  );
}

function Arm({ near, r }: { near: boolean; r: (k: HikerJoint) => (el: SVGGElement | null) => void }) {
  const sleeve = near ? C.jacket : C.jacketFar;
  return (
    <g ref={r(near ? 'nearShoulder' : 'farShoulder')}>
      <path d="M-3.7 -2.5 Q-4.1 7 -3.3 15 L3.5 15 Q4.3 7 3.9 -2.5 Q0 -5 -3.7 -2.5 Z" fill={sleeve} />
      {near && <path d="M1.2 -3 Q3.6 -2 3.8 4 Q3.9 10 3.3 14 L1.9 14 Q2.5 6 1.2 -3 Z" fill={C.jacketLt} />}
      <g ref={r(near ? 'nearElbow' : 'farElbow')}>
        <path d="M-3.3 -1.2 L3.5 -1.2 Q3.5 6 3.1 11.2 L-2.9 11.2 Q-3.3 6 -3.3 -1.2 Z" fill={sleeve} />
        <rect x="-3.2" y="9.4" width="6.4" height="2.8" rx="1.1" fill={near ? C.jacketSh : '#8E3118'} />
        <ellipse cx="0.3" cy="14.2" rx="2.6" ry="3" fill={near ? C.skin : C.skinSh} />
        {near && (
          <g ref={r('mug')} opacity="0">
            <rect x="1.6" y="10" width="5.6" height="6.6" rx="1.1" fill={C.mug} />
            <path d="M7.2 11.6 Q9.6 13.2 7.2 15" stroke={C.mug} strokeWidth="1.2" fill="none" />
            <ellipse cx="4.4" cy="10.2" rx="2.8" ry="0.7" fill="#5A3B2A" />
            <g className="ft-steam" opacity="0.7">
              <path d="M3.4 8 Q2 5.4 3.6 3.6 Q5 1.8 3.8 -0.6" stroke="#fff" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              <path d="M5.6 7.6 Q4.6 5.6 5.8 4 Q6.8 2.6 6 0.8" stroke="#fff" strokeWidth="0.7" fill="none" strokeLinecap="round" />
            </g>
          </g>
        )}
      </g>
    </g>
  );
}

export function HikerRig({ refs }: { refs: React.MutableRefObject<HikerRefs> }) {
  const r = (k: HikerJoint) => (el: SVGGElement | null) => {
    refs.current[k] = el;
  };
  return (
    <g>
      {/* 接地影 */}
      <ellipse cx="2" cy="1.2" rx="16" ry="2.4" fill="#2A1A0A" opacity="0.18" />
      <g ref={r('hips')}>
        <Leg near={false} r={r} />

        <g ref={r('torsoBack')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near={false} r={r} />
          </g>

          {/* ザック（胴の後ろ） */}
          <g ref={r('pack')}>
            <rect x="-22.5" y="-33.5" width="16.5" height="30.5" rx="5.2" fill={C.pack} />
            <rect x="-12.4" y="-31" width="4.8" height="26" rx="2.4" fill={C.packLt} />
            <rect x="-21.4" y="-14.5" width="9.2" height="10.5" rx="3" fill={C.packSh} />
            <path d="M-23 -30.4 Q-14 -36.6 -5.6 -31.4 L-6 -26.2 Q-14 -30.6 -22.6 -25.4 Z" fill={C.packSh} />
            <rect x="-18.2" y="-24" width="2" height="5" rx="1" fill={C.strap} />
            {/* ロールマット */}
            <rect x="-23" y="-42" width="18" height="8.4" rx="4.2" fill={C.mat} />
            <rect x="-22" y="-41" width="15.6" height="2.4" rx="1.2" fill={C.matLt} />
            <ellipse cx="-5.2" cy="-37.8" rx="2.6" ry="4.2" fill={C.matEnd} />
            <path d="M-5.2 -37.8 m-1.1 0 a1.1 1.1 0 1 1 1.1 1.1" stroke={C.matLt} strokeWidth="0.6" fill="none" />
            <path d="M-17 -42 L-17 -33.6 M-10 -42 L-10 -33.6" stroke={C.strap} strokeWidth="1.2" />
          </g>

          {/* 腰回り + ジャケット */}
          <path d="M-6.6 -4 L6.6 -4 L6.2 4 Q0 6.2 -6.2 4 Z" fill={C.pants} />
          <path d="M-7.6 2 Q-8.6 -12 -8.1 -24 Q-7.1 -31.6 0.5 -32.2 Q7.6 -31.6 8.3 -24 Q8.9 -12 8.1 2 Q0 4.6 -7.6 2 Z" fill={C.jacket} />
          <path d="M3 -29.4 Q7.2 -27.2 7.7 -20 Q8.1 -8 7.5 0 L4.3 0.9 Q5.1 -12 3 -29.4 Z" fill={C.jacketLt} />
          <path d="M-7.7 0 Q-8.5 -12 -7.9 -24 L-5 -26.4 Q-5.7 -12 -5.1 1.2 Z" fill={C.jacketSh} />
          <path d="M-7.7 0.2 Q0 2.8 8.1 0.2 L8.1 2 Q0 4.6 -7.6 2 Z" fill={C.jacketSh} opacity="0.7" />
          <path d="M5.6 -30 L6.1 1" stroke={C.jacketSh} strokeWidth="0.6" />
          <rect x="1.6" y="-19" width="4.4" height="3.4" rx="0.8" fill={C.jacketSh} opacity="0.55" />
          <path d="M-3 -31 Q2 -34.4 6.2 -30.6 L5 -27.8 Q1 -30 -2.6 -28.4 Z" fill={C.jacketSh} />
          {/* ショルダーストラップ・ヒップベルト */}
          <path d="M-6.4 -30.4 Q0.4 -27 1.2 -14" stroke={C.strap} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M-7.4 -6.4 L7.8 -5.4" stroke={C.strap} strokeWidth="2.1" strokeLinecap="round" />
          <rect x="5.2" y="-7.4" width="3.2" height="3.6" rx="0.8" fill="#2E2A26" />

          {/* 頭 */}
          <g ref={r('head')}>
            <rect x="-1.8" y="-4.4" width="4.6" height="5.4" rx="1.4" fill={C.skinSh} />
            <ellipse cx="2" cy="-11.4" rx="6.4" ry="7.6" fill={C.skin} />
            <path d="M-3.2 -9.4 Q-2.2 -3.4 2 -3.8 Q-1 -5.4 -1.6 -9.4 Z" fill={C.skinSh} opacity="0.55" />
            <path d="M7.8 -12.2 Q10.5 -10.6 8.4 -8.8 Z" fill={C.skin} />
            <ellipse cx="5.6" cy="-12.2" rx="0.8" ry="1.15" fill="#2A1E1A" />
            <path d="M4.4 -14.6 L6.8 -14.2" stroke={C.hair} strokeWidth="0.7" strokeLinecap="round" />
            <ellipse cx="4.4" cy="-9" rx="1.6" ry="1" fill="#E8907A" opacity="0.55" />
            <path d="M5.8 -6.8 Q6.9 -6.1 7.7 -6.9" stroke="#8A4A3A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
            <ellipse cx="-1.2" cy="-11.2" rx="1.6" ry="2.2" fill={C.skinSh} />
            <path d="M-4.8 -14.6 Q-6.4 -6 -3 -3.6 Q-2 -8.4 -1.6 -12.6 Z" fill={C.hair} />
            {/* ニット帽 */}
            <path d="M-5.2 -14.8 Q-4.8 -24.6 2.4 -25.1 Q9.4 -24.6 9.2 -14.8 Z" fill={C.hat} />
            <path d="M3.6 -24.1 Q8.7 -22.4 8.7 -16.2 L6.7 -16.2 Q7 -21.3 3.6 -24.1 Z" fill={C.hatLt} />
            <path d="M0 -24.6 L0 -17 M-2.8 -23.4 L-3 -17" stroke={C.hatBand} strokeWidth="0.6" opacity="0.6" />
            <rect x="-5.8" y="-16.6" width="15.6" height="4.2" rx="2.1" fill={C.hatBand} />
            <g ref={r('pom')}>
              <circle cx="2.2" cy="-27.2" r="3.3" fill={C.pom} />
              <circle cx="3.2" cy="-28.2" r="1.3" fill={C.pomLt} />
            </g>
          </g>
        </g>

        <Leg near r={r} />

        <g ref={r('torsoFront')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near r={r} />
          </g>
        </g>
      </g>
    </g>
  );
}

const set = (el: SVGGElement | null | undefined, v: string) => {
  if (el) el.setAttribute('transform', v);
};

/** ポーズを関節へ書き込む（毎フレーム） */
export function applyHikerPose(refs: HikerRefs, p: HikerPose) {
  set(refs.hips, `translate(0 ${-p.hipY})`);
  const torso = `rotate(${p.lean})`;
  set(refs.torsoBack, torso);
  set(refs.torsoFront, torso);
  set(refs.pack, `translate(0 ${p.pack}) rotate(${-p.pack * 0.8} -14 -18)`);
  set(refs.head, `translate(${JOINT.neck.x} ${JOINT.neck.y}) rotate(${p.head})`);
  set(refs.pom, `translate(0 ${p.pom * 0.5}) rotate(${p.pom * 3} 2.2 -24)`);
  set(refs.nearThigh, `rotate(${p.nearHip})`);
  set(refs.nearKnee, `translate(0 ${JOINT.knee}) rotate(${p.nearKnee})`);
  set(refs.nearAnkle, `translate(0 ${JOINT.ankle}) rotate(${p.nearAnkle})`);
  set(refs.farThigh, `rotate(${p.farHip})`);
  set(refs.farKnee, `translate(0 ${JOINT.knee}) rotate(${p.farKnee})`);
  set(refs.farAnkle, `translate(0 ${JOINT.ankle}) rotate(${p.farAnkle})`);
  set(refs.nearShoulder, `rotate(${p.nearShoulder})`);
  set(refs.nearElbow, `translate(0 ${JOINT.elbow}) rotate(${p.nearElbow})`);
  set(refs.farShoulder, `rotate(${p.farShoulder})`);
  set(refs.farElbow, `translate(0 ${JOINT.elbow}) rotate(${p.farElbow})`);
  if (refs.mug) refs.mug.setAttribute('opacity', String(Math.max(0, (p.mug - 0.5) * 2)));
}
