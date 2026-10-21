import type { Transition } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };
export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 28 };
export const springBouncy: Transition = { type: 'spring', stiffness: 460, damping: 22 };
export const springSheet: Transition = { type: 'spring', stiffness: 340, damping: 36, mass: 0.9 };

/** iOS の減速カーブ（初速が速く、最後にスッと収まる）と、わずかに弾むバネのカーブ。時間で決める動きはこのどちらか */
export const easeIOS = [0.22, 1, 0.36, 1] as const;
export const easeSpring = [0.34, 1.56, 0.64, 1] as const;
