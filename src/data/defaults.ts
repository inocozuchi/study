import type { Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  pomodoroFocus: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  longBreakEvery: 4,
  countdownMinutes: 50,
  mode: 'pomodoro',
  deepFocus: false,
  wakeLock: true,
  chime: true,
  ambient: { rain: 0, fire: 0.55, wind: 0.3, river: 0 },
  ambientPlaying: false,
  selectedSubjectId: null,
  sky: 'auto',
};
