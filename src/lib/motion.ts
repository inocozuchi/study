import type { Transition } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };
export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 28 };
export const springBouncy: Transition = { type: 'spring', stiffness: 460, damping: 22 };
export const springSheet: Transition = { type: 'spring', stiffness: 340, damping: 36, mass: 0.9 };
