import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { spring } from '@/lib/motion';

/** ボタン。押し込み（縮んでバネで戻る）は lib/press.ts がアプリ全体で付ける。scale で縮み具合を変えられる */
export const Pressable = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & { scale?: number }>(
  ({ scale, className = '', type = 'button', ...rest }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      data-press-scale={scale}
      transition={spring}
      className={`select-none outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${className}`}
      {...rest}
    />
  ),
);
Pressable.displayName = 'Pressable';
