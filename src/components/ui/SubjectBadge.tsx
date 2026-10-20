import { SUBJECT_ICONS, alpha } from '@/lib/subjects';
import type { Subject } from '@/types';

export function SubjectIcon({ subject, size = 18 }: { subject: Pick<Subject, 'icon'>; size?: number }) {
  const Icon = SUBJECT_ICONS[subject.icon]?.icon ?? SUBJECT_ICONS.book.icon;
  return <Icon size={size} strokeWidth={2.2} />;
}

export function SubjectBadge({ subject, size = 36, rounded = 'rounded-xl' }: { subject: Pick<Subject, 'icon' | 'color'>; size?: number; rounded?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${rounded}`}
      style={{
        width: size,
        height: size,
        color: subject.color,
        background: alpha(subject.color, 0.16),
        boxShadow: `inset 0 0 0 1px ${alpha(subject.color, 0.3)}`,
      }}
    >
      <SubjectIcon subject={subject} size={Math.round(size * 0.5)} />
    </span>
  );
}
