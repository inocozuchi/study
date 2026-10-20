import type { Subject } from '@/types';
import { alpha } from '@/lib/subjects';

/** 登頂記念スタンプ（SVG） */
export function SummitStamp({ subject, size = 120, date }: { subject: Pick<Subject, 'color' | 'mountainName' | 'name'>; size?: number; date?: number }) {
  const c = subject.color;
  const d = date ? new Date(date) : null;
  const id = `arc-${subject.mountainName}-${size}`.replace(/\s/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label={`${subject.mountainName} 登頂スタンプ`}>
      <defs>
        <path id={id} d="M 60 60 m -44 0 a 44 44 0 1 1 88 0 a 44 44 0 1 1 -88 0" />
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.35" />
          <stop offset="1" stopColor={c} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={`url(#${id}-g)`} stroke={c} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="36" fill="none" stroke={alpha(c, 0.55)} strokeWidth="1" strokeDasharray="2 3" />
      <text fill={c} fontSize="9.5" fontWeight="700" letterSpacing="2.5">
        <textPath href={`#${id}`} startOffset="0%">
          {`SUMMIT · ${subject.name} · ${d ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : 'FOCUS TRAIL'} ·`}
        </textPath>
      </text>
      <path d="M38 74 L52 50 L58 58 L66 44 L82 74 Z" fill={alpha(c, 0.9)} />
      <path d="M66 44 L61 51 L65 53 L69 49 Z M52 50 L49 55 L54 56 Z" fill="#fff" fillOpacity="0.9" />
      <path d="M66 44 L66 34" stroke="#fff" strokeWidth="1.4" />
      <path d="M66 34 L74 37 L66 40 Z" fill="#fff" />
      <text x="60" y="88" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        {subject.mountainName}
      </text>
    </svg>
  );
}
