import type { Subject, SubjectIconKey } from '@/types';

/**
 * 予約の座席で選ぶ「集中すること」。選んだ名前がそのまま科目になる（なければ ensureSubject で作る）。
 * 列車・航空の両方の座席指定で使う（見た目はデザインごと）。
 */
export const TASK_PRESETS: { name: string; icon: SubjectIconKey }[] = [
  { name: 'フォーカス', icon: 'target' },
  { name: '作業', icon: 'briefcase' },
  { name: '簿記', icon: 'calculator' },
  { name: '読む', icon: 'book' },
  { name: 'プログラミング', icon: 'code' },
  { name: '運動', icon: 'dumbbell' },
  { name: '瞑想する', icon: 'flower' },
];

export interface TaskOption {
  name: string;
  icon: SubjectIconKey;
  /** 科目の色（すでにある科目だけ） */
  color?: string;
}

/** 座席のポップアップに並べる候補：いまある科目 → 定番（同じ名前は 1 つ） */
export function taskOptions(subjects: Subject[]): TaskOption[] {
  const out: TaskOption[] = subjects.map((s) => ({ name: s.name, icon: s.icon, color: s.color }));
  for (const p of TASK_PRESETS) if (!out.some((o) => o.name === p.name)) out.push(p);
  return out;
}

/** 名前からアイコン（科目 → 定番 → 本） */
export function taskIcon(name: string, subjects: Subject[]): SubjectIconKey {
  return subjects.find((s) => s.name === name)?.icon ?? TASK_PRESETS.find((p) => p.name === name)?.icon ?? 'book';
}
