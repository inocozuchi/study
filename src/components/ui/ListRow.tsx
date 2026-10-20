import type { ReactNode } from 'react';

/** iOS 設定アプリ風の行 */
export function ListRow({ icon, iconBg, title, subtitle, right, onClick }: { icon?: ReactNode; iconBg?: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5">
      {icon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: iconBg ?? 'rgba(255,255,255,0.12)' }}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[12px] leading-snug text-white/45">{subtitle}</span>}
      </span>
      {right}
    </Comp>
  );
}

export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass-thin divide-y divide-white/[0.06] overflow-hidden rounded-2xl ${className}`}>{children}</div>;
}
