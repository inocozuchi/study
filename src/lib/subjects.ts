import {
  BookOpen, Brain, Calculator, Code, Coins, FlaskConical, Globe, Landmark, Languages, Music,
  PenLine, Scale, type LucideIcon,
} from 'lucide-react';
import type { SubjectIconKey } from '@/types';

/** 図表でも使うため、暗い面に対して色覚多様性チェック済みの 8 色（順序固定） */
export const SUBJECT_COLORS = [
  '#3987e5', // glacier blue
  '#d95926', // ember
  '#199e70', // moss
  '#c98500', // sun
  '#d55181', // alpenglow
  '#008300', // forest
  '#9085e9', // dusk violet
  '#e66767', // rhododendron
] as const;

export const SUBJECT_ICONS: Record<SubjectIconKey, { icon: LucideIcon; label: string }> = {
  book: { icon: BookOpen, label: '読書' },
  calculator: { icon: Calculator, label: '計算' },
  coins: { icon: Coins, label: 'お金' },
  languages: { icon: Languages, label: '語学' },
  code: { icon: Code, label: 'コード' },
  landmark: { icon: Landmark, label: '経済' },
  flask: { icon: FlaskConical, label: '理科' },
  pen: { icon: PenLine, label: '記述' },
  music: { icon: Music, label: '音楽' },
  brain: { icon: Brain, label: '思考' },
  globe: { icon: Globe, label: '社会' },
  scale: { icon: Scale, label: '法律' },
};

export const MOUNTAIN_SUGGESTIONS = [
  '槍ヶ岳', '穂高岳', '剱岳', '白馬岳', '燕岳', '八ヶ岳', '立山', '富士山',
  '北岳', '甲斐駒ヶ岳', '鹿島槍ヶ岳', '常念岳', '大雪山', '鳥海山', '月山', '大山',
];

/** 16進カラー → rgba */
export function alpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
