import type { DogPose } from './rigMath';

/**
 * 小さなザックを背負ったコーギーのリグ（右向き）。原点は胴の真下の地面。
 *   body(bob+pitch) ─┬ far legs（前・後、上腕 → 下腿）
 *                    ├ tail / torso / pack
 *                    ├ head ─ ears
 *                    └ near legs
 */

export type DogJoint = 'body' | 'head' | 'ears' | 'tail' | 'nfU' | 'nfL' | 'ffU' | 'ffL' | 'nbU' | 'nbL' | 'fbU' | 'fbL';
export type DogRefs = Partial<Record<DogJoint, SVGGElement | null>>;

const C = {
  fur: '#D98A3D', furLt: '#EFA65C', furSh: '#B0672A', furFar: '#A65F27',
  white: '#F7EFE2', whiteSh: '#DCCFBC', nose: '#2A201C',
  pack: '#3D79CF', packLt: '#68A1EA', packSh: '#2C5DA5',
};

const FRONT = { x: 11, y: -1.5 };
const BACK = { x: -13, y: -1 };
const UPPER = 6.2;
const BODY_Y = -12.6;

function DogLeg({ id, far, r }: { id: 'nf' | 'ff' | 'nb' | 'fb'; far?: boolean; r: (k: DogJoint) => (el: SVGGElement | null) => void }) {
  const fur = far ? C.furFar : C.fur;
  const back = id === 'nb' || id === 'fb';
  return (
    <g ref={r(`${id}U` as DogJoint)}>
      <path d={back ? 'M-3.4 -3 Q-3.8 3 -2.2 7 L2.4 7 Q3.2 2 3 -3 Z' : 'M-2.5 -2.4 L2.7 -2.4 L2.3 7 L-2.1 7 Z'} fill={fur} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
      <g ref={r(`${id}L` as DogJoint)}>
        <path d="M-2.1 -0.6 L2.3 -0.6 L2.1 5.6 L-1.9 5.6 Z" fill={fur} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
        <ellipse cx="0.8" cy="6" rx="2.7" ry="1.6" fill={far ? C.whiteSh : C.white} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </g>
  );
}

export function DogRig({ refs }: { refs: React.MutableRefObject<DogRefs> }) {
  const r = (k: DogJoint) => (el: SVGGElement | null) => {
    refs.current[k] = el;
  };
  return (
    <g>
      <ellipse cx="0" cy="0.8" rx="17" ry="2" fill="#2A1A0A" opacity="0.16" />
      <g ref={r('body')}>
        <g transform={`translate(${FRONT.x + 2.4} ${FRONT.y})`}><DogLeg id="ff" far r={r} /></g>
        <g transform={`translate(${BACK.x + 2.4} ${BACK.y})`}><DogLeg id="fb" far r={r} /></g>

        <g ref={r('tail')}>
          <path d="M0 0 Q-7 -4 -5.5 -9.4 Q-1.4 -7.4 2.2 -2.2 Z" fill={C.furLt} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
          <path d="M-5.5 -9.4 Q-3.4 -8 -2.4 -6.2" stroke={C.white} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* 胴 */}
        <path d="M-19.4 -2 Q-20.4 -9.4 -12 -10.4 L10 -10.4 Q18.4 -9.8 18.8 -2 Q18.4 5.2 10 5.8 L-12 5.8 Q-20.4 5.2 -19.4 -2 Z" fill={C.fur} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
        <path d="M-12 4.2 Q0 7.8 11 4.8 Q12 1.2 10 0.2 Q0 3.2 -12 1.2 Z" fill={C.white} />
        <path d="M12 -6.4 Q19.4 -4.4 18.4 3 Q15.4 6.2 11 5.4 Z" fill={C.white} />
        <path d="M-12.4 -9.8 L8 -10.1 Q2 -7.8 -10.4 -7.8 Z" fill={C.furLt} />
        <path d="M-19 0 Q-19.4 -6 -15 -8.4 Q-16.4 -3 -14.4 3.6 Z" fill={C.furSh} opacity="0.6" />
        <path d="M-16 -4 l3 -3 M-15 1 l3.4 -3.4 M-10 3.4 l3 -3" stroke="#2E221C" strokeWidth="0.6" opacity="0.3" strokeLinecap="round" />

        {/* 小さなザック */}
        <rect x="-8.6" y="-15.2" width="15" height="9.6" rx="3.2" fill={C.pack} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
        <rect x="-7.6" y="-14.2" width="13" height="2.2" rx="1.1" fill={C.packLt} />
        <path d="M-3.6 -10.4 m-2 0 a1 1 0 1 1 1 -1 l3.2 0 a1 1 0 1 1 1 1 a1 1 0 1 1 -1 1 l-3.2 0 a1 1 0 1 1 -1 -1 Z" fill={C.white} />
        <path d="M-1 -5.8 L-1 5.4" stroke={C.packSh} strokeWidth="1.4" />

        {/* 頭 */}
        <g ref={r('head')}>
          <g ref={r('ears')}>
            <path d="M0 0 L1.4 -10.6 L6.4 -1 Z" fill={C.furSh} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
            <path d="M2.4 0.4 L5.4 -12 L9.8 -1.2 Z" fill={C.fur} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
            <path d="M4.2 -1.2 L5.6 -8.8 L8 -1.8 Z" fill="#F4C3A6" />
          </g>
          <path d="M-3 -6.2 Q0 -12 7 -11 Q11 -10.4 13 -6 Q17 -5 17.6 -2.6 Q17.2 0 13 0.3 Q6 1.1 1 0.1 Q-4 -2 -3 -6.2 Z" fill={C.fur} stroke="#2E221C" strokeWidth="1" strokeLinejoin="round" />
          <path d="M8 -5.2 Q14 -6.2 17.6 -2.6 Q16.9 0.3 12 0.5 Q8 0.1 7.5 -2.6 Z" fill={C.white} />
          <path d="M6.6 -11 Q8.6 -8 8.1 -5.4 Q9.7 -8 10.4 -10.6 Z" fill={C.white} />
          <ellipse cx="17.3" cy="-3.4" rx="1.5" ry="1.15" fill={C.nose} />
          <ellipse cx="9.8" cy="-6.8" rx="0.95" ry="1.15" fill={C.nose} />
          <path d="M12.4 -0.1 Q14.2 2.8 16.2 0.1 Z" fill="#C2554A" />
          <path d="M-1 -4 Q-0.6 0 3 0.2" stroke={C.furSh} strokeWidth="1" fill="none" opacity="0.6" />
        </g>

        <g transform={`translate(${FRONT.x} ${FRONT.y})`}><DogLeg id="nf" r={r} /></g>
        <g transform={`translate(${BACK.x} ${BACK.y})`}><DogLeg id="nb" r={r} /></g>
      </g>
    </g>
  );
}

const set = (el: SVGGElement | null | undefined, v: string) => {
  if (el) el.setAttribute('transform', v);
};

export function applyDogPose(refs: DogRefs, p: DogPose) {
  set(refs.body, `translate(0 ${BODY_Y + p.bodyY}) rotate(${p.pitch})`);
  set(refs.head, `translate(14.6 -8.4) rotate(${p.head} 0 -2)`);
  set(refs.ears, `translate(2.4 -9.6) rotate(${p.ears} 4 0)`);
  set(refs.tail, `translate(-19.2 -5.4) rotate(${p.tail})`);
  set(refs.nfU, `rotate(${p.nfU})`);
  set(refs.nfL, `translate(0 ${UPPER}) rotate(${p.nfL})`);
  set(refs.ffU, `rotate(${p.ffU})`);
  set(refs.ffL, `translate(0 ${UPPER}) rotate(${p.ffL})`);
  set(refs.nbU, `rotate(${p.nbU})`);
  set(refs.nbL, `translate(0 ${UPPER}) rotate(${p.nbL})`);
  set(refs.fbU, `rotate(${p.fbU})`);
  set(refs.fbL, `translate(0 ${UPPER}) rotate(${p.fbL})`);
}
