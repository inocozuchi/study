import type { HikerPose } from './rigMath';
import { HIKER } from './rigMath';
import { CrayonPart, INK, darker, pastel } from './CrayonPart';

/**
 * クレヨン × パステルで描いたハイカーのリグ（右向き）。原点は股関節の真下の地面。
 * 黒い輪郭線は使わず、縁は塗りより少し濃いパステル色の途切れた線。
 * 関節ごとの動かない絵は CrayonPart でクレヨンのフィルタごと画像に焼く（動かすのは transform だけ）。
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
    // テラコッタ × ダスティミント
    hat: '#8FBFAE', hatRib: '#73A595', pom: '#F3DE9A',
    parka: '#D98A6C', parkaLt: '#E8A88C', parkaSh: '#B96F55',
    sleeve: '#CF7E62', sleeveSh: '#AD6650',
    scarf: '#F0D28A',
    pants: '#8C705C', pantsSh: '#6E5646',
    boot: '#9A6A52', sock: '#F4ECDC',
    pack: '#E9C07A', packSh: '#C99E5E', mat: '#8FB3D9',
    skin: '#F4D2B8', hair: '#C98A62',
  },
  {
    // くすんだ空色 × クリーム
    hat: '#E39A8A', hatRib: '#C47D6E', pom: '#FBF4E4',
    parka: '#8DB4D6', parkaLt: '#AECBE4', parkaSh: '#6E95B8',
    sleeve: '#8FBF9E', sleeveSh: '#72A182',
    scarf: '#F1E6CC',
    pants: '#7E7A8C', pantsSh: '#615E70',
    boot: '#8A6450', sock: '#F2DC92',
    pack: '#A9C98A', packSh: '#88A86C', mat: '#E9A276',
    skin: '#EEC3A2', hair: '#6E5444',
  },
  {
    // ラベンダー × 菜の花
    hat: '#F1CF84', hatRib: '#D3B068', pom: '#E48E78',
    parka: '#AE9AD0', parkaLt: '#C6B6E2', parkaSh: '#8E7AB2',
    sleeve: '#9D89C2', sleeveSh: '#7F6CA4',
    scarf: '#92CEC6',
    pants: '#6F86A2', pantsSh: '#566C86',
    boot: '#8E6250', sock: '#F4ECDC',
    pack: '#E48E78', packSh: '#C2725E', mat: '#F2DC92',
    skin: '#F6D6BE', hair: '#8A6448',
  },
];

const LW = 0.95;
const paint = (fill: string, w = LW) => pastel(fill, w);

export const JOINT = {
  knee: HIKER.thigh,
  ankle: HIKER.shin,
  shoulder: { x: 1, y: -28 },
  elbow: 14,
  neck: { x: 1.4, y: -32 },
};

type R = (k: HikerJoint) => (el: SVGGElement | null) => void;

/** 斜線の陰影 */
function Hatch({ d, color = INK, opacity = 0.22, w = 0.7 }: { d: string; color?: string; opacity?: number; w?: number }) {
  return <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={opacity} fill="none" />;
}

function Leg({ near, r, c, bk }: { near: boolean; r: R; c: HikerPalette; bk: string }) {
  const pants = near ? c.pants : c.pantsSh;
  return (
    <g ref={r(near ? 'nearThigh' : 'farThigh')}>
      <CrayonPart bakeKey={bk}>
        <path d="M-5.6 -3 Q-6.4 12 -4.8 25 L5 25 Q6.4 12 5.8 -3 Z" {...paint(pants)} />
        {near && <Hatch d="M-4 4 l2.4 -2.4 M-4.2 9 l2.6 -2.6 M-4.2 14 l2.6 -2.6 M-4 19 l2.4 -2.4" />}
      </CrayonPart>
      <g ref={r(near ? 'nearKnee' : 'farKnee')}>
        <CrayonPart bakeKey={bk}>
          <path d="M-4.9 -1.6 L5 -1.6 Q4.8 10 4.2 21.6 L-3.9 21.6 Q-4.6 10 -4.9 -1.6 Z" {...paint(pants)} />
          {/* 縞の靴下 */}
          <rect x="-4.2" y="16.4" width="8.4" height="5" rx="1.4" {...paint(c.sock, LW * 0.8)} />
          <path d="M-4 18.8 L4.2 18.8" stroke={near ? c.parka : c.parkaSh} strokeWidth="1.1" />
        </CrayonPart>
        <g ref={r(near ? 'nearAnkle' : 'farAnkle')}>
          <CrayonPart bakeKey={bk}>
            <path d="M-4.8 -2.8 L4 -2.8 Q5.4 0.2 9.6 1.2 Q12.4 2 12 4 L-5.6 4 Q-6 0.4 -4.8 -2.8 Z" {...paint(near ? c.boot : darker(c.boot, 0.18))} />
            <path d="M0.6 -1.6 L4.4 0.4 M2.2 -2.4 L5.8 -0.4" stroke="#F2D9B8" strokeWidth="0.75" strokeLinecap="round" opacity={near ? 0.8 : 0.4} />
            <path d="M-5.8 3.4 L12.2 3.4 L11.8 5.6 L-5.6 5.6 Z" fill={darker(c.boot, 0.35)} />
          </CrayonPart>
        </g>
      </g>
    </g>
  );
}

function Arm({ near, r, c, bk }: { near: boolean; r: R; c: HikerPalette; bk: string }) {
  const sleeve = near ? c.sleeve : c.sleeveSh;
  return (
    <g ref={r(near ? 'nearShoulder' : 'farShoulder')}>
      {/* ふくらんだ袖（キルティング） */}
      <CrayonPart bakeKey={bk}>
        <path d="M-4.6 -3 Q-5.4 7 -4.2 15.4 L4.4 15.4 Q5.6 7 4.8 -3 Q0 -6 -4.6 -3 Z" {...paint(sleeve)} />
        <path d="M-4.4 5 Q0 6.6 4.8 5 M-4.2 10.6 Q0 12 4.6 10.6" stroke={darker(sleeve, 0.3)} strokeWidth="0.6" opacity="0.6" fill="none" />
      </CrayonPart>
      <g ref={r(near ? 'nearElbow' : 'farElbow')}>
        <CrayonPart bakeKey={bk}>
          <path d="M-4.2 -1.4 L4.4 -1.4 Q4.4 6 3.9 11.4 L-3.6 11.4 Q-4.2 6 -4.2 -1.4 Z" {...paint(sleeve)} />
          {near && <Hatch d="M-3 2 l2.2 -2 M-3 6 l2.2 -2" opacity={0.3} />}
          {/* ミトン */}
          <path d="M-3.2 10.6 Q-4.2 16.6 0.4 17.4 Q4.6 17.2 4 10.6 Z" {...paint(near ? c.scarf : darker(c.scarf, 0.14))} />
          <path d="M3.2 12 Q5.8 12.4 5 14.8 Q4 15.4 3.2 14.6" {...paint(near ? c.scarf : darker(c.scarf, 0.14), LW * 0.8)} />
        </CrayonPart>
      </g>
    </g>
  );
}

export function HikerRig({ refs, palette = HIKER_PALETTES[0] }: { refs: React.MutableRefObject<HikerRefs>; palette?: HikerPalette }) {
  const c = palette;
  // 色が変わったら焼き直す
  const bk = Object.values(c).join('');
  const r: R = (k) => (el) => {
    refs.current[k] = el;
  };
  return (
    <g>
      <ellipse cx="2" cy="1.4" rx="17" ry="2.6" fill="#4A3426" opacity="0.16" />
      <g ref={r('hips')}>
        <Leg near={false} r={r} c={c} bk={bk} />

        <g ref={r('torsoBack')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near={false} r={r} c={c} bk={bk} />
          </g>

          {/* ザック + ロールマット */}
          <g ref={r('pack')}>
            <CrayonPart bakeKey={bk}>
              <path d="M-24 -31 Q-25 -18 -23.4 -4 Q-15 -1.6 -7 -4 L-7 -33 Q-16 -36 -24 -31 Z" {...paint(c.pack)} />
              <path d="M-22.6 -15 L-12.6 -15 L-12.8 -5.4 Q-18 -4 -22.4 -5.6 Z" {...paint(c.packSh, LW * 0.8)} />
              <Hatch d="M-22 -28 l3 -3 M-22.4 -23 l4 -4 M-22.6 -18 l3 -3" opacity={0.3} />
              <path d="M-24.4 -31.4 Q-15.6 -38 -6.4 -32.6 L-7 -27.4 Q-15.6 -32 -24 -26.6 Z" {...paint(c.packSh)} />
              <rect x="-25.4" y="-44" width="20" height="9.6" rx="4.8" {...paint(c.mat)} />
              <path d="M-23 -41.4 L-9 -41.4" stroke="#fff" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
              <ellipse cx="-5.6" cy="-39.2" rx="2.8" ry="4.8" {...paint(c.mat)} />
              <path d="M-5.6 -39.2 m-1.2 0 a1.2 1.4 0 1 1 1.2 1.4 a2.2 2.6 0 1 1 1.6 -3" stroke={darker(c.mat, 0.35)} strokeWidth="0.6" fill="none" />
              <path d="M-19 -44 L-19 -34.6 M-11 -44 L-11 -34.6" stroke={darker(c.mat, 0.35)} strokeWidth="1.3" />
            </CrayonPart>
          </g>

          {/* パーカー（キルティング） */}
          <CrayonPart bakeKey={bk}>
            <path d="M-6.6 -4 L6.6 -4 L6.2 4 Q0 6.4 -6.2 4 Z" {...paint(c.pants)} />
            <path d="M-9.2 3 Q-10.4 -12 -9.6 -25 Q-8.2 -33.4 0.8 -34 Q9.2 -33.4 9.8 -25 Q10.6 -12 9.6 3 Q0 6.2 -9.2 3 Z" {...paint(c.parka, LW * 1.15)} />
            <path d="M3.6 -31 Q8.4 -28.4 8.8 -20 Q9.2 -8 8.6 1.4 L5.2 2.2 Q6.2 -12 3.6 -31 Z" fill={c.parkaLt} />
            <path d="M-9.4 -6 Q0 -3.4 9.8 -6 M-9.8 -14.6 Q0 -12 10 -14.6 M-9.6 -22.6 Q0 -20.4 9.8 -22.6" stroke={darker(c.parka, 0.3)} strokeWidth="0.65" opacity="0.6" fill="none" />
            <Hatch d="M-8.4 -2 l3.2 -3.2 M-8.8 -9 l3.6 -3.6 M-8.8 -16 l3.6 -3.6 M-8.6 -23 l3.2 -3.2" opacity={0.32} />
            <path d="M6.4 -31 L7 2" stroke={c.parkaSh} strokeWidth="0.9" />
            <rect x="1.4" y="-19.6" width="5" height="3.8" rx="1" fill={c.parkaSh} stroke={darker(c.parkaSh)} strokeWidth="0.6" />
            {/* ショルダーストラップ・ヒップベルト */}
            <path d="M-7.6 -31.4 Q0.6 -27.4 1.6 -14.6" stroke={darker(c.pack, 0.3)} strokeWidth="2.3" fill="none" strokeLinecap="round" />
            <path d="M-8.8 -6.8 L9.2 -5.8" stroke={darker(c.pack, 0.3)} strokeWidth="2.4" strokeLinecap="round" />
          </CrayonPart>
          {/* マフラー */}
          <g ref={r('scarf')}>
            <CrayonPart bakeKey={bk}>
              <path d="M-6.4 -33.6 Q1 -37.4 8.2 -32.6 Q8.6 -29 7 -28 Q0.4 -31.6 -5.8 -29.4 Z" {...paint(c.scarf)} />
              <path d="M-2 -33.8 L-1.4 -30 M2.4 -34.2 L2.6 -30.6" stroke={darker(c.scarf, 0.3)} strokeWidth="0.55" opacity="0.5" />
            </CrayonPart>
          </g>

          {/* 頭 */}
          <g ref={r('head')}>
            <CrayonPart bakeKey={bk}>
              <path d="M-2 -4 Q-0.8 -6.4 3.2 -5.6 L3.4 1 L-2 1 Z" {...paint(c.skin, LW * 0.8)} />
              <path d="M-4.6 -12 Q-5.8 -19.4 1.6 -20.8 Q8.8 -21 9.2 -13 Q9.4 -6.4 4.4 -4 Q-3 -3 -4.6 -12 Z" {...paint(c.skin)} />
              {/* 大きめの鼻 */}
              <path d="M8 -13.4 Q12.4 -12.6 11.6 -9.6 Q10.4 -8.2 8.2 -9.2" {...paint(c.skin)} />
              <ellipse cx="5.8" cy="-13.4" rx="0.95" ry="1.3" fill={INK} />
              <path d="M4.4 -16.4 Q6 -17.2 7.4 -16.4" stroke={INK} strokeWidth="0.75" fill="none" strokeLinecap="round" />
              <ellipse cx="5" cy="-9.4" rx="2" ry="1.3" fill="#E8826C" opacity="0.55" />
              <path d="M6 -6.6 Q7.4 -5.8 8.4 -6.8" stroke={INK} strokeWidth="0.7" fill="none" strokeLinecap="round" />
              <ellipse cx="-1.4" cy="-12.2" rx="1.7" ry="2.4" {...paint(c.skin, LW * 0.8)} />
              {/* はみ出す髪（ギザギザ） */}
              <path d="M-5 -16.8 L-7.6 -14.4 L-5.4 -13.6 L-7.8 -10.4 L-4.6 -10.8 L-6 -7.4 L-3 -8.6 L-3.4 -14 Z" {...paint(c.hair, LW * 0.7)} />
              {/* ニット帽（リブ編み） */}
              <path d="M-5.8 -16.4 Q-5.6 -27.6 2.4 -28.2 Q10.2 -27.8 10.2 -16.4 Z" {...paint(c.hat)} />
              <path d="M-2.4 -26 L-2.6 -18 M0.8 -27.4 L0.8 -18 M4 -27.6 L4.2 -18 M7.2 -26.2 L7.4 -18" stroke={c.hatRib} strokeWidth="0.8" />
              <path d="M-6.6 -18.6 L10.8 -18.6 L11 -14.4 L-6.6 -14.4 Z" {...paint(c.hatRib)} />
              <path d="M-5.4 -16.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4 l1.2 -1.4 l1.2 1.4" stroke={c.hat} strokeWidth="0.7" fill="none" />
            </CrayonPart>
            <g ref={r('pom')}>
              <CrayonPart bakeKey={bk}>
                {/* ポンポン（ギザギザの毛糸） */}
                <path d="M2.4 -27.6 L0 -29.4 L-0.6 -32.2 L1.4 -31.4 L1.8 -34.6 L3.4 -32 L5.6 -33.8 L5.2 -30.6 L7 -29.8 L4.8 -28.2 Z" {...paint(c.pom, LW * 0.8)} />
              </CrayonPart>
            </g>
          </g>
        </g>

        <Leg near r={r} c={c} bk={bk} />

        <g ref={r('torsoFront')}>
          <g transform={`translate(${JOINT.shoulder.x} ${JOINT.shoulder.y})`}>
            <Arm near r={r} c={c} bk={bk} />
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
