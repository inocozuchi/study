import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyCachedFont } from './lib/fonts';
import { watchViewport } from './lib/viewport';
import { consumeRedirect } from './lib/googleCalendar';

applyCachedFont();
watchViewport();
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
