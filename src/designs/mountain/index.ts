import './mountain.css';
import { MountainScene } from './MountainScene';
import { MountainSession } from './MountainSession';
import { MountainResult } from './MountainResult';
import { SeasonPicker } from './SeasonPicker';
import { IdCard } from './IdCard';
import { MountainCustomize } from './MountainCustomize';
import type { TimerDesign } from '../types';
import { SEASONS, stageSky } from './scene/palette';
import { hexToRgb, mix, type RGB } from '@/lib/scene';

const hex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const parse = (c: string): RGB => (c.startsWith('#') ? hexToRgb(c) : (c.match(/[\d.]+/g)!.slice(0, 3).map(Number) as RGB));

/**
 * 登山デザイン：集中は山を登る旅、休憩は焚き火、終わりはキャンプの夜。
 * クレヨン × 布の見た目はこのフォルダの中だけで完結させる。
 */
export const mountainDesign: TimerDesign = {
  id: 'mountain',
  name: '登山',
  tagline: '集中は山を登る旅。休憩は焚き火、終わりはキャンプの夜',
  ProfileCard: IdCard,
  ProfileOptions: MountainCustomize,
  Scene: MountainScene,
  Session: MountainSession,
  Result: MountainResult,
  SetupOptions: SeasonPicker,
  setupLabel: 'シーズン',
  // 上の帯は空のいちばん上の色、下の帯は手前の草原の影の色（夜は群青を重ねたぶん暗く）
  edgeColors: (hour, settings) => {
    const look = SEASONS[settings.season];
    const sky = stageSky(hour, look.skyBlue);
    const ground = mix(hexToRgb(look.meadow.sh), hexToRgb('#16204A'), sky.night * 0.7);
    return { top: hex(parse(sky.top)), bottom: hex(ground) };
  },
};
