import { motion, type HTMLMotionProps } from 'framer-motion';
import { springSoft } from '@/lib/motion';

export function GlassCard({ className = '', children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springSoft, delay }}
      className={`glass rounded-3xl ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
