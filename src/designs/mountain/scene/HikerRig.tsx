import type { HikerPose } from './rigMath';
import { HIKER } from './rigMath';

/**
 * クレヨンで描いたハイカーのリグ（右向き）。原点は股関節の真下の地面。
 * 太い輪郭線 + 斜線の陰影 + #crayon-boil（線が震える）で手描きの絵本のように見せる。
 *
 * 階層：
 *   hips ─┬ farLeg(thigh → knee → ankle/boot)
 *         ├ torsoBack ─┬ farArm(shoulder → elbow → hand)
 *         │            ├ pack（バウンス）/ parka / scarf
 *         │            └ head ─ pom
 *         ├ nearLeg(thigh → knee → ankle/boot)
 *         └ torsoFront ─ nearArm(shoulder → elbow → hand) / scarfTail
 */

export type HikerJoint =
  | 'hips' | 'torsoBack' | 'torsoFront' | 'pack' | 'head' | 'pom' | 'scarf'
  | 'nearThigh' | 'nearKnee' | 'nearAnkle' | 'farThigh' | 'farKnee' | 'farAnkle'
  | 'nearShoulder' | 'nearElbow' | 'farShoulder' | 'farElbow';

export type HikerRefs = Partial<Record<HikerJoint, SVGGElement | null>>;

export interface HikerPalette {
  hat: string; hatRib: string; pom: string;
  parka: string; parkaLt: string; parkaSh: string;
  sleeve: string; sleeveSh: string;
  scarf: string;
  pants: string; pantsSh: string;
  boot: string; sock: string;
  pack: string; packSh: string; mat: string;
  skin: string; hair: string;
}

export const HIKER_PALETTES: HikerPalette[] = [
  {
    hat: '#2E8C86', hatRib: '#1F6763', pom: '#F4C64E',
    parka: '#D9552C', parkaLt: '#F07A45', parkaSh: '#A93E1E',
    sleeve: '#C94A26', sleeveSh: '#97361A',
    scarf: '#F0B53A',
    pants: '#5A4436', pantsSh: '#3F2F26',
    boot: '#7B3E2B', sock: '#EFE6D2',
    pack: '#F0A537', packSh: '#C47E27', mat: '#3D79CF',
    skin: '#F2C3A0', hair: '#C2562A',
  },
  {
    hat: '#C9453A', hatRib: '#962F27', pom: '#FFFFFF',
    parka: '#3E86C9', parkaLt: '#62A4DE', parkaSh: '#2A5F96',
    sleeve: '#3E8C68', sleeveSh: '#2B6A4E',
    scarf: '#E8E0CC',
    pants: '#4A4A5A', pantsSh: '#33333F',
    boot: '#5E3A2A', sock: '#F2D06A',
    pack: '#7FB04A', packSh: '#5E8A36', mat: '#E8743A',
    skin: '#E9B48E', hair: '#3B2A22',
  },
  {
    hat: '#F2B33D', hatRib: '#C68A22', pom: '#D9573B',
    parka: '#7E5BB0', parkaLt: '#9D7FCB', parkaSh: '#5A3F85',
    sleeve: '#6A4C99', sleeveSh: '#4C356F',
    scarf: '#5EB8B0',
    pants: '#2F4A6B', pantsSh: '#22364F',
    boot: '#6B3A2A', sock: '#EFE6D2',
    pack: '#D9573B', packSh: '#A63E28', mat: '#F2D06A',
    skin: '#F5CDAE', hair: '#5A3A26',
  },
];

const OUT = '#2E221C';
const LW = 1.15;

export const JOINT = {
  knee: HIKER.thigh,
  ankle: HIKER.shin,
  shoulder: { x: 1, y: -28 },
  elbow: 14,
  neck: { x: 1.4, y: -32 },
};

type R = (k: HikerJoint) => (el: SVGGElement | null) => void;

/** 斜線の陰影 */
function Hatch({ d, color = OUT, opacity = 0.35, w = 0.7 }: { d: string; color?: string; opacity?: number; w?: number }) {
  return <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={opacity} fill="none" />;
}

function Leg({ near, r, c }: { near: boolean; r: R; c: HikerPalette }) {
  const pants = near ? c.pants : c.pantsSh;
  return (
    <g ref={r(near ? 'nearThigh' : 'farThigh')}>
      <path d="M-5.6 -3 Q-6.4 12 -4.8 25 L5 25 Q6.4 12 5.8 -3 Z" fill={pants} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {near && <Hatch d="M-4 4 l2.4 -2.4 M-4.2 9 l2.6 -2.6 M-4.2 14 l2.6 -2.6 M-4 19 l2.4 -2.4" />}
      <g ref={r(near ? 'nearKnee' : 'farKnee')}>
        <path d="M-4.9 -1.6 L5 -1.6 Q4.8 10 4.2 21.6 L-3.9 21.6 Q-4.6 10 -4.9 -1.6 Z" fill={pants} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
        {/* 縞の靴下 */}
        <rect x="-4.2" y="16.4" width="8.4" height="5" rx="1.4" fill={c.sock} stroke={OUT} strokeWidth={LW * 0.8} />
        <path d="M-4 18.8 L4.2 18.8" stroke={near ? c.parka : c.parkaSh} strokeWidth="1.1" />
        <g ref={r(near ? 'nearAnkle' : 'farAnkle')}>
          <path d="M-4.8 -2.8 L4 -2.8 Q5.4 0.2 9.6 1.2 Q12.4 2 12 4 L-5.6 4 Q-6 0.4 -4.8 -2.8 Z" fill={near ? c.boot : '#5A2C1E'} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
          <path d="M0.6 -1.6 L4.4 0.4 M2.2 -2.4 L5.8 -0.4" stroke="#F2D9B8" strokeWidth="0.75" strokeLinecap="round" opacity={near ? 0.8 : 0.4} />
          <path d="M-5.8 3.4 L12.2 3.4 L11.8 5.6 L-5.6 5.6 Z" fill={OUT} />
        </g>
      </g>
    </g>
  );
}

function Arm({ near, r, c }: { near: boolean; r: R; c: HikerPalette }) {
  const sleeve = near ? c.sleeve : c.sleeveSh;
  return (
    <g ref={r(near ? 'nearShoulder' : 'farShoulder')}>
      {/* ふくらんだ袖（キルティング） */}
      <path d="M-4.6 -3 Q-5.4 7 -4.2 15.4 L4.4 15.4 Q5.6 7 4.8 -3 Q0 -6 -4.6 -3 Z" fill={sleeve} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M-4.4 5 Q0 6.6 4.8 5 M-4.2 10.6 Q0 12 4.6 10.6" stroke={OUT} strokeWidth="0.6" opacity="0.45" fill="none" />
      <g ref={r(near ? 'nearElbow' : 'farElbow')}>
        <path d="M-4.2 -1.4 L4.4 -1.4 Q4.4 6 3.9 11.4 L-3.6 11.4 Q-4.2 6 -4.2 -1.4 Z" fill={sleeve} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
        {near && <Hatch d="M-3 2 l2.2 -2 M-3 6 l2.2 -2" opacity={0.3} />}
        {/* ミトン */}
        <path d="M-3.2 10.6 Q-4.2 16.6 0.4 17.4 Q4.6 17.2 4 10.6 Z" fill={near ? c.scarf : '#C9932E'} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
        <path d="M3.2 12 Q5.8 12.4 5 14.8 Q4 15.4 3.2 14.6" fill={near ? c.scarf : '#C9932E'} stroke={OUT} strokeWidth={LW * 0.8} />
      </g>
    </g>
  );
}

export function HikerRig({ refs, palette = HIKER_PALETTES[0] }: { refs: React.MutableRefObject<HikerRefs>; palette?: HikerPalette }) {
  const c = palette;
  const r: R = (k) => (el) => {
    refs.current[k] = el;
  };
  return (
    <g filter="url(#crayon-boil)">
      <ellipse cx="2" cy="1.4" rx="17" ry="2.6" fill="#2A1A0A" opacity="0.2" />
      <g ref={r('hips')}>
        <Leg near={false} r={r} c={c} />

        <g ref={r('torsoBack')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near={false} r={r} c={c} />
          </g>

          {/* ザック + ロールマット */}
          <g ref={r('pack')}>
            <path d="M-24 -31 Q-25 -18 -23.4 -4 Q-15 -1.6 -7 -4 L-7 -33 Q-16 -36 -24 -31 Z" fill={c.pack} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <path d="M-22.6 -15 L-12.6 -15 L-12.8 -5.4 Q-18 -4 -22.4 -5.6 Z" fill={c.packSh} stroke={OUT} strokeWidth={LW * 0.8} />
            <Hatch d="M-22 -28 l3 -3 M-22.4 -23 l4 -4 M-22.6 -18 l3 -3" opacity={0.3} />
            <path d="M-24.4 -31.4 Q-15.6 -38 -6.4 -32.6 L-7 -27.4 Q-15.6 -32 -24 -26.6 Z" fill={c.packSh} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <rect x="-25.4" y="-44" width="20" height="9.6" rx="4.8" fill={c.mat} stroke={OUT} strokeWidth={LW} />
            <path d="M-23 -41.4 L-9 -41.4" stroke="#fff" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
            <ellipse cx="-5.6" cy="-39.2" rx="2.8" ry="4.8" fill={c.mat} stroke={OUT} strokeWidth={LW} />
            <path d="M-5.6 -39.2 m-1.2 0 a1.2 1.4 0 1 1 1.2 1.4 a2.2 2.6 0 1 1 1.6 -3" stroke={OUT} strokeWidth="0.6" fill="none" />
            <path d="M-19 -44 L-19 -34.6 M-11 -44 L-11 -34.6" stroke={OUT} strokeWidth="1.3" />
          </g>

          {/* パーカー（キルティング） */}
          <path d="M-6.6 -4 L6.6 -4 L6.2 4 Q0 6.4 -6.2 4 Z" fill={c.pants} stroke={OUT} strokeWidth={LW} />
          <path d="M-9.2 3 Q-10.4 -12 -9.6 -25 Q-8.2 -33.4 0.8 -34 Q9.2 -33.4 9.8 -25 Q10.6 -12 9.6 3 Q0 6.2 -9.2 3 Z" fill={c.parka} stroke={OUT} strokeWidth={LW * 1.15} strokeLinejoin="round" />
          <path d="M3.6 -31 Q8.4 -28.4 8.8 -20 Q9.2 -8 8.6 1.4 L5.2 2.2 Q6.2 -12 3.6 -31 Z" fill={c.parkaLt} />
          <path d="M-9.4 -6 Q0 -3.4 9.8 -6 M-9.8 -14.6 Q0 -12 10 -14.6 M-9.6 -22.6 Q0 -20.4 9.8 -22.6" stroke={OUT} strokeWidth="0.65" opacity="0.5" fill="none" />
          <Hatch d="M-8.4 -2 l3.2 -3.2 M-8.8 -9 l3.6 -3.6 M-8.8 -16 l3.6 -3.6 M-8.6 -23 l3.2 -3.2" opacity={0.32} />
          <path d="M6.4 -31 L7 2" stroke={c.parkaSh} strokeWidth="0.9" />
          <rect x="1.4" y="-19.6" width="5" height="3.8" rx="1" fill={c.parkaSh} stroke={OUT} strokeWidth="0.6" />
          {/* ショルダーストラップ・ヒップベルト */}
          <path d="M-7.6 -31.4 Q0.6 -27.4 1.6 -14.6" stroke={OUT} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M-8.8 -6.8 L9.2 -5.8" stroke={OUT} strokeWidth="2.4" strokeLinecap="round" />
          {/* マフラー */}
          <g ref={r('scarf')}>
            <path d="M-6.4 -33.6 Q1 -37.4 8.2 -32.6 Q8.6 -29 7 -28 Q0.4 -31.6 -5.8 -29.4 Z" fill={c.scarf} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <path d="M-2 -33.8 L-1.4 -30 M2.4 -34.2 L2.6 -30.6" stroke={OUT} strokeWidth="0.55" opacity="0.5" />
          </g>

          {/* 頭 */}
          <g ref={r('head')}>
            <path d="M-2 -4 Q-0.8 -6.4 3.2 -5.6 L3.4 1 L-2 1 Z" fill={c.skin} stroke={OUT} strokeWidth={LW * 0.8} />
            <path d="M-4.6 -12 Q-5.8 -19.4 1.6 -20.8 Q8.8 -21 9.2 -13 Q9.4 -6.4 4.4 -4 Q-3 -3 -4.6 -12 Z" fill={c.skin} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            {/* 大きめの鼻 */}
            <path d="M8 -13.4 Q12.4 -12.6 11.6 -9.6 Q10.4 -8.2 8.2 -9.2" fill={c.skin} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <ellipse cx="5.8" cy="-13.4" rx="0.95" ry="1.3" fill={OUT} />
            <path d="M4.4 -16.4 Q6 -17.2 7.4 -16.4" stroke={OUT} strokeWidth="0.75" fill="none" strokeLinecap="round" />
            <ellipse cx="5" cy="-9.4" rx="2" ry="1.3" fill="#E8826C" opacity="0.55" />
            <path d="M6 -6.6 Q7.4 -5.8 8.4 -6.8" stroke={OUT} strokeWidth="0.7" fill="none" strokeLinecap="round" />
            <ellipse cx="-1.4" cy="-12.2" rx="1.7" ry="2.4" fill={c.skin} stroke={OUT} strokeWidth={LW * 0.8} />
            {/* はみ出す髪（ギザギザ） */}
            <path d="M-5 -16.8 L-7.6 -14.4 L-5.4 -13.6 L-7.8 -10.4 L-4.6 -10.8 L-6 -7.4 L-3 -8.6 L-3.4 -14 Z" fill={c.hair} stroke={OUT} strokeWidth={LW * 0.7} strokeLinejoin="round" />
            {/* ニット帽（リブ編み） */}
            <path d="M-5.8 -16.4 Q-5.6 -27.6 2.4 -28.2 Q10.2 -27.8 10.2 -16.4 Z" fill={c.hat} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <path d="M-2.4 -26 L-2.6 -18 M0.8 -27.4 L0.8 -18 M4 -27.6 L4.2 -18 M7.2 -26.2 L7.4 -18" stroke={c.hatRib} strokeWidth="0.8" />
            <path d="M-6.6 -18.6 L10.8 -18.6 L11 -14.4 L-6.6 -14.4 Z" fill={c.hatRib} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
            <path d="M-5.4 -16.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4" stroke={c.hat} strokeWidth="0.7" fill="none" />
            <g ref={r('pom')}>
              {/* ポンポン（ギザギザの毛糸） */}
              <path d="M2.4 -27.6 L0 -29.4 L-0.6 -32.2 L1.4 -31.4 L1.8 -34.6 L3.4 -32 L5.6 -33.8 L5.2 -30.6 L7 -29.8 L4.8 -28.2 Z" fill={c.pom} stroke={OUT} strokeWidth={LW * 0.8} strokeLinejoin="round" />
            </g>
          </g>
        </g>

        <Leg near r={r} c={c} />

        <g ref={r('torsoFront')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near r={r} c={c} />
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
  set(refs.pom, `translate(0 ${p.pom * 0.5}) rotate(${p.pom * 4} 2.4 -28)`);
  set(refs.scarf, `rotate(${p.pom * -0.6} 0 -32)`);
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
}
