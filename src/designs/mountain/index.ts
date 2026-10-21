import './mountain.css';
import { MountainScene } from './MountainScene';
import { MountainSession } from './MountainSession';
import { MountainResult } from './MountainResult';
import { SeasonPicker } from './SeasonPicker';
import { IdCard } from './IdCard';
import { MountainFocus } from './HomeFocus';
import { MountainBooking } from './booking/MountainBooking';
import { MountainCustomize } from './MountainCustomize';
import type { TimerDesign } from '../types';
import { SEASONS, stageSky } from './scene/palette';
import { hexToRgb, mix, type RGB } from '@/lib/scene';

const hex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const parse = (c: string): RGB => (c.startsWith('#') ? hexToRgb(c) : (c.match(/[\d.]+/g)!.slice(0, 3).map(Number) as RGB));

/**
 * 登山デザイン：集中は山を登る旅、休憩は焚き火、終わりはキャンプの夜。
 * 透明水彩 × 水彩紙の見た目はこのフォルダの中だけで完結させる。
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
  // 「集中」で開く登山届（山岳ルート計画）。支度シートの代わり
  Booking: MountainBooking,
  setupLabel: 'シーズン',
  // 上の帯は空のいちばん上の色、下の帯は手前の草原の影の色（夜は群青を重ねたぶん暗く）
  skeleton: '#1C2433',
  home: {
    chip: 'mt-chip',
    // 空の上のほうを水彩のにじみのようにうすく明るくし、深いフォレストグリーンの文字を読みやすく
    scrim: 'linear-gradient(180deg, rgba(250,248,243,0.62) 0%, rgba(250,248,243,0.32) 60%, rgba(250,248,243,0) 100%)',
    greeting: 'font-maru text-[#2C4A3E] [text-shadow:0_1px_0_rgba(255,255,255,0.6)]',
    tabbar: { bar: 'mt-tabbar', pill: 'mt-tabbar-pill', on: 'text-[#2C4A3E]', off: 'text-[#2C4A3E]/55' },
    Focus: MountainFocus,
    bloom: 'rgba(251,248,241,0.9)',
  },
  edgeColors: (hour, settings) => {
    const look = SEASONS[settings.season];
    const sky = stageSky(hour, look.skyBlue);
    const ground = mix(hexToRgb(look.meadow.sh), hexToRgb('#16204A'), sky.night * 0.7);
    return { top: hex(parse(sky.top)), bottom: hex(ground) };
  },
};
