import { useState } from 'react';
import { useApp } from '@/store/AppStore';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { disconnect, ensureRange, isConnected, redirectUri, resolveClientId, startConnect, useGoogleCalendar, BUILTIN_CLIENT_ID } from '@/lib/googleCalendar';
import { addDays, locale, startOfWeek } from '@/lib/time';

/** 設定の行に出すいまの状態 */
export function googleStatusLabel(status: string, connected: boolean) {
  if (status === 'loading') return '読み込み中…';
  if (status === 'error') return '読み込めませんでした';
  if (status === 'needs-auth') return '再接続が必要です';
  return connected ? '接続済み' : '未接続';
}

/** Google カレンダー（読み取りのみ）の接続・クライアント ID・表示するカレンダー */
export function GoogleCalendarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const google = useGoogleCalendar();
  const [clientId, setClientId] = useState(settings.googleClientId);
  const id = resolveClientId(clientId);
  const connected = isConnected();
  const hidden = settings.googleHiddenCalendars;

  const refresh = () => {
    const from = startOfWeek(new Date());
    void ensureRange(from, addDays(from, 42).getTime(), hidden, true);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Google カレンダー" subtitle="予定をタイムラインに表示します（見るだけ・書き換えません）">
      <div className="space-y-5 pb-6">
        <div className="card flex items-center justify-between px-4 py-3">
          <span>
            <span className="block text-ui-[14px] font-bold">{googleStatusLabel(google.status, connected)}</span>
            {google.message && <span className="mt-0.5 block text-ui-[12px] text-danger-ink">{google.message}</span>}
            {google.fetchedAt && <span className="mt-0.5 block text-ui-[12px] text-fg-2">最終更新 {new Date(google.fetchedAt).toLocaleString(locale(), { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
          {connected && (
            <button onClick={refresh} className="btn-secondary px-3 py-2 text-ui-[12.5px]">
              更新
            </button>
          )}
        </div>

        {!BUILTIN_CLIENT_ID && (
          <label className="block">
            <span className="section-label mb-1.5 block px-1">OAuth クライアント ID</span>
            <input
              className="field font-mono text-ui-[12.5px]"
              value={clientId}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setClientId(e.target.value)}
              onBlur={() => updateSettings({ googleClientId: clientId.trim() })}
            />
            <span className="mt-2 block px-1 text-ui-[12px] leading-relaxed text-fg-2">
              Google Cloud の「認証情報」で OAuth クライアント ID（ウェブ アプリケーション）を作り、
              承認済みの JavaScript 生成元に <span className="font-mono text-fg">{location.origin}</span>、
              リダイレクト URI に <span className="break-all font-mono text-fg">{redirectUri()}</span> を登録して貼り付けてください。
            </span>
          </label>
        )}

        <button
          disabled={!id}
          onClick={() => {
            updateSettings({ googleClientId: clientId.trim() });
            startConnect(id);
          }}
          className="btn-primary w-full disabled:opacity-40"
        >
          {connected ? 'もう一度ログインする' : 'Google でログインして接続'}
        </button>

        {google.calendars.length > 0 && (
          <section>
            <p className="section-label mb-2 px-1">表示するカレンダー</p>
            <div className="flex flex-col gap-2">
              {google.calendars.map((c) => {
                const shown = !hidden.includes(c.id);
                return (
                  <div key={c.id} className="card flex items-center gap-3 px-4 py-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-ui-[14px] font-bold">{c.name}</span>
                    <Toggle
                      checked={shown}
                      label={c.name}
                      onChange={(v) => updateSettings({ googleHiddenCalendars: v ? hidden.filter((x) => x !== c.id) : [...hidden, c.id] })}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {connected && (
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="w-full rounded-card bg-danger-soft py-3 text-ui-[14px] font-bold text-danger-ink"
          >
            接続を解除
          </button>
        )}
      </div>
    </Sheet>
  );
}
