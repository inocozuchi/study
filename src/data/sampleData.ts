import type { AppData, DiaryEntry, FocusSession, Habit, PlanBlock, Subject, Todo } from '@/types';
import { DEFAULT_SETTINGS } from './defaults';
import { seeded } from '@/lib/id';
import { DAY, MIN, dateKey, minutesOfDay, startOfDay } from '@/lib/time';

/** 現在日時を基準に、約5週間分のリアルな学習履歴を生成する */
export function createSampleData(now = Date.now()): AppData {
  const rand = seeded(20261020);
  const created = now - 40 * DAY;

  const subjects: Subject[] = [
    { id: 'sub-econ', name: '経済学', color: '#3987e5', icon: 'landmark', mountainName: '槍ヶ岳', targetMinutes: 2200, createdAt: created },
    { id: 'sub-boki', name: '簿記2級', color: '#c98500', icon: 'calculator', mountainName: '穂高岳', targetMinutes: 1500, createdAt: created },
    { id: 'sub-eng', name: '英語', color: '#199e70', icon: 'languages', mountainName: '燕岳', targetMinutes: 600, createdAt: created },
    { id: 'sub-code', name: 'プログラミング', color: '#9085e9', icon: 'code', mountainName: '剱岳', targetMinutes: 2400, createdAt: created },
    { id: 'sub-fp', name: 'FP3級', color: '#d55181', icon: 'coins', mountainName: '白馬岳', targetMinutes: 900, createdAt: now - 12 * DAY },
  ];

  const weights: Record<string, number> = { 'sub-econ': 3, 'sub-boki': 2.4, 'sub-eng': 2.6, 'sub-code': 2, 'sub-fp': 1 };
  const pick = (dayIdx: number) => {
    const pool = subjects.filter((s) => s.id !== 'sub-fp' || dayIdx < 12);
    const total = pool.reduce((a, s) => a + weights[s.id], 0);
    let r = rand() * total;
    for (const s of pool) {
      r -= weights[s.id];
      if (r <= 0) return s.id;
    }
    return pool[0].id;
  };

  const sessions: FocusSession[] = [];
  const today0 = startOfDay(now);
  const SLOTS = [6.5, 7.5, 9, 10.5, 13, 14.5, 16, 19, 20.5, 21.5, 22.5];

  for (let d = 35; d >= 1; d--) {
    const day0 = today0 - d * DAY;
    // 3日続けて1日休む程度の確率、直近12日は連続学習（ストリーク演出）
    if (d > 12 && rand() < 0.22) continue;
    const count = 2 + Math.floor(rand() * 4);
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let slot = SLOTS[Math.floor(rand() * SLOTS.length)];
      while (used.has(slot)) slot = SLOTS[Math.floor(rand() * SLOTS.length)];
      used.add(slot);
      const startMin = slot * 60 + Math.floor(rand() * 20);
      const len = [25, 25, 25, 50, 45, 60, 90, 30][Math.floor(rand() * 8)];
      const start = day0 + startMin * MIN;
      const subjectId = pick(d);
      sessions.push({
        id: `smp-${d}-${i}`,
        subjectId,
        start,
        end: start + len * MIN,
        minutes: len,
        source: len === 25 ? 'pomodoro' : len === 90 ? 'stopwatch' : 'countdown',
        note: rand() < 0.25 ? NOTES[subjectId][Math.floor(rand() * 3)] : undefined,
      });
    }
  }

  // 英語は登頂済みに調整
  const engMinutes = sessions.filter((s) => s.subjectId === 'sub-eng').reduce((a, s) => a + s.minutes, 0);
  if (engMinutes < 620) {
    for (let k = 0; k < Math.ceil((620 - engMinutes) / 45); k++) {
      const start = today0 - (20 - k) * DAY + 7 * 60 * MIN;
      sessions.push({ id: `smp-eng-${k}`, subjectId: 'sub-eng', start, end: start + 45 * MIN, minutes: 45, source: 'countdown' });
    }
  }

  // 今日の実績（現在時刻より前）と予定（後）
  const nowMin = minutesOfDay(now);
  const todayKey = dateKey(now);
  const todayBlocks: Array<[number, number, string, string?]> = [
    [7 * 60, 7 * 60 + 25, 'sub-eng', '朝の音読'],
    [9 * 60, 9 * 60 + 50, 'sub-econ', 'ミクロ：消費者理論'],
    [10 * 60 + 5, 10 * 60 + 55, 'sub-econ'],
    [13 * 60 + 30, 14 * 60 + 30, 'sub-boki', '工業簿記 過去問'],
    [15 * 60, 15 * 60 + 45, 'sub-code', 'React の型'],
    [19 * 60 + 30, 20 * 60 + 20, 'sub-fp', 'ライフプランニング'],
    [21 * 60, 21 * 60 + 50, 'sub-code'],
    [22 * 60 + 15, 22 * 60 + 40, 'sub-eng', '単語 Anki'],
  ];
  const plans: PlanBlock[] = [];
  todayBlocks.forEach(([s, e, subjectId, title], i) => {
    plans.push({ id: `plan-today-${i}`, subjectId, date: todayKey, startMin: s, endMin: e, title });
    if (e <= nowMin) {
      const start = today0 + s * MIN;
      sessions.push({
        id: `smp-today-${i}`, subjectId, start, end: today0 + e * MIN, minutes: e - s, source: 'pomodoro',
        note: title,
      });
    }
  });
  // 明日の予定
  const tomorrow = dateKey(today0 + DAY);
  [[8 * 60, 9 * 60, 'sub-econ', 'マクロ：IS-LM'], [10 * 60, 10 * 60 + 50, 'sub-boki'], [20 * 60, 21 * 60, 'sub-code', '個人開発']].forEach(
    ([s, e, subjectId, title], i) =>
      plans.push({ id: `plan-tmr-${i}`, subjectId: subjectId as string, date: tomorrow, startMin: s as number, endMin: e as number, title: title as string | undefined }),
  );

  sessions.sort((a, b) => a.start - b.start);
  // 累計が目標を越えた時点を登頂日とする
  for (const sub of subjects) {
    let acc = 0;
    for (const s of sessions) {
      if (s.subjectId !== sub.id) continue;
      acc += s.minutes;
      if (acc >= sub.targetMinutes) {
        sub.summitedAt = s.end;
        break;
      }
    }
  }
  // ToDo・習慣・ノート
  const todos: Todo[] = [
    { id: 'todo-1', text: 'ミクロ経済の第4章を読む', done: true, createdAt: now - DAY, doneAt: now - 3 * 60 * MIN },
    { id: 'todo-2', text: '簿記の過去問 第3回を解く', done: false, createdAt: now - DAY },
    { id: 'todo-3', text: '英単語 50 個', done: false, createdAt: now - 2 * 60 * MIN },
    { id: 'todo-4', text: 'ゼミの発表スライドを直す', done: false, createdAt: now - 60 * MIN },
  ];
  const habitLog = (rate: number, seed: number) => {
    const r = seeded(seed);
    return Array.from({ length: 21 }, (_, i) => dateKey(today0 - (i + 1) * DAY)).filter(() => r() < rate);
  };
  const habits: Habit[] = [
    { id: 'hab-1', name: '朝の音読', emoji: '📖', color: '#199e70', createdAt: created, log: [todayKey, ...habitLog(0.8, 1)] },
    { id: 'hab-2', name: '25分だけでも机に向かう', emoji: '⛰️', color: '#3987e5', createdAt: created, log: [todayKey, ...habitLog(0.9, 2)] },
    { id: 'hab-3', name: 'ストレッチ', emoji: '🧘', color: '#d55181', createdAt: created, log: habitLog(0.5, 3) },
  ];
  const diary: DiaryEntry[] = [
    { date: dateKey(today0 - DAY), text: '工業簿記の連結がやっと腑に落ちた。焚き火の音を流すと集中が続く気がする。', mood: 4, updatedAt: now - DAY },
  ];

  return {
    subjects,
    sessions,
    plans,
    settings: { ...DEFAULT_SETTINGS, selectedSubjectId: 'sub-fp' },
    diary,
    todos,
    habits,
  };
}

const NOTES: Record<string, string[]> = {
  'sub-econ': ['需要曲線の導出を復習', 'ゲーム理論の章を読了', '計算問題 10 問'],
  'sub-boki': ['仕訳を総ざらい', '連結会計が難しい…', '模試 72 点'],
  'sub-eng': ['シャドーイング 3 本', 'TOEIC Part 5', '洋書を 20 ページ'],
  'sub-code': ['TypeScript ジェネリクス', 'アルゴリズム演習', 'テストを書いた'],
  'sub-fp': ['年金のしくみ', '税金の基礎', '過去問 1 回分'],
};
