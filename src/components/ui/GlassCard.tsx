import { motion, type HTMLMotionProps } from 'framer-motion';

/**
 * 画面の中に並ぶカード（白い面 + やわらかい影、角丸 13px）。開いたときだけ少し下から現れる。
 * 名前は歴史的に GlassCard のまま（すりガラスはやめ、泰山木POS と同じ浮いた面にした）。
 */
export function GlassCard({ className = '', children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1], delay }}
      className={`card ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
