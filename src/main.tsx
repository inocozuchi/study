import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyCachedFont } from './lib/fonts';
import { applyLanguage, cachedLanguage } from './lib/i18n';
import { consumeRedirect } from './lib/googleCalendar';
import { installPress } from './lib/press';

applyCachedFont();
// 前回の言語（英語なら辞書を読み、画面に出た文字を英語にする）
void applyLanguage(cachedLanguage());
// すべてのボタンの押し込み（iOS のタップ感）
installPress();
// Google カレンダーの接続から戻ってきたときは、タイムラインを開いて予定を見せる
if (consumeRedirect()) {
  try {
    sessionStorage.setItem('focus-trail:tab', 'timeline');
  } catch {
    /* 開く画面が変わらないだけ */
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('[focus-trail] SW registration failed', e));
  });
}
