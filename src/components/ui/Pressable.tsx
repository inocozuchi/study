import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { spring } from '@/lib/motion';

/** iOS 風のタップ感（押し込み + スプリング復帰）を持つボタン */
export const Pressable = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & { scale?: number }>(
  ({ scale = 0.95, className = '', type = 'button', ...rest }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale }}
      transition={spring}
      className={`select-none outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${className}`}
      {...rest}
    />
  ),
);
Pressable.displayName = 'Pressable';
