import type { FocusSession, PlanBlock, Subject } from '@/types';
import { MIN, minutesOfDay, startOfDay } from '@/lib/time';

export interface TimelineItem {
  key: string;
  kind: 'plan' | 'session';
  startMin: number;
  endMin: number;
  subject?: Subject;
  title: string;
  note?: string;
  /** 予定に対して実績がある / 実績そのもの */
  done: boolean;
  plan?: PlanBlock;
  session?: FocusSession;
  /** 予定と一致した実績の時刻 */
  actual?: { startMin: number; endMin: number; minutes: number };
}

export function buildTimeline(dayKey: string, dayStart: number, plans: PlanBlock[], sessions: FocusSession[], subjectById: (id: string) => Subject | undefined): TimelineItem[] {
  const day0 = startOfDay(dayStart);
  const daySessions = sessions.filter((s) => s.start >= day0 && s.start < day0 + 24 * 60 * MIN);
  const dayPlans = plans.filter((p) => p.date === dayKey);
  const used = new Set<string>();
  const items: TimelineItem[] = [];

  for (const p of dayPlans) {
    // 同じ科目で時間が重なる実績を予定の達成とみなす
    const match = daySessions
      .filter((s) => !used.has(s.id) && s.subjectId === p.subjectId)
      .map((s) => {
        const sm = minutesOfDay(s.start);
        const em = sm + (s.end - s.start) / MIN;
        return { s, sm, em, overlap: Math.min(em, p.endMin) - Math.max(sm, p.startMin) };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)[0];
    if (match) used.add(match.s.id);
    const subject = subjectById(p.subjectId);
    items.push({
      key: `p-${p.id}`,
      kind: 'plan',
      startMin: p.startMin,
      endMin: p.endMin,
      subject,
      title: p.title || subject?.name || '学習',
      done: !!match,
      plan: p,
      session: match?.s,
      note: match?.s.note,
      actual: match ? { startMin: match.sm, endMin: match.em, minutes: match.s.minutes } : undefined,
    });
  }

  for (const s of daySessions) {
    if (used.has(s.id)) continue;
    const subject = subjectById(s.subjectId);
    const sm = minutesOfDay(s.start);
    items.push({
      key: `s-${s.id}`,
      kind: 'session',
      startMin: sm,
      endMin: sm + (s.end - s.start) / MIN,
      subject,
      title: s.note || subject?.name || '集中',
      note: s.note,
      done: true,
      session: s,
    });
  }

  return items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}
