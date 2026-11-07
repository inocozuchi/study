import { useEffect, useState } from 'react';

/**
 * 数字が回って変わる（iOS の数字の切り替え）。数字だけを縦に並べた帯にして、transform で回す。
 * 開いたときは 0 から今の値へ回る。数字以外（単位・「なし」など）はひとまとまりの文字のまま（英語の訳がそのまま効く）。
 * 桁は右から数えて並べる（桁が増えても一の位が入れ替わらない）。動きを減らす設定のときは回さない（index.css の .roll）。
 */
export function Rolling({ value, className = '' }: { value: string | number; className?: string }) {
  const text = String(value);
  const [shown, setShown] = useState(() => text.replace(/\d/g, '0'));
  useEffect(() => {
    // 1 フレーム待ってから本当の値へ（最初の描画は 0 のまま → 回る）
    const id = requestAnimationFrame(() => setShown(text));
    return () => cancelAnimationFrame(id);
  }, [text]);
  const parts = shown.match(/\d|\D+/g) ?? [];
  return (
    <span className={`tabular ${className}`} aria-label={text}>
      <span aria-hidden className="inline-flex items-baseline">
        {parts.map((p, i) => {
          const key = parts.length - i; // 右から数えた位置
          if (!/\d/.test(p)) return <span key={`t${key}`}>{p}</span>;
          const d = Number(p);
          return (
            <span key={`d${key}`} className="roll">
              <span style={{ transform: `translateY(${-d * 10}%)`, transitionDelay: `${Math.min(4, parts.length - 1 - i) * 30}ms` }}>
                {DIGITS.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
