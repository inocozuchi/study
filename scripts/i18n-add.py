"""
英語の辞書（src/i18n/en.json）に訳を足す。

  python3 scripts/i18n-add.py add.json     add.json＝{"plain": {日本語: 英語}, "tpl": {"…{0}…": "…{0}…"}}

足したあとは scripts/i18n-missing.py で残りがないか確かめる。
"""
import json, sys
from pathlib import Path
p = Path(__file__).resolve().parent.parent / 'src' / 'i18n' / 'en.json'
d = json.loads(p.read_text())
add = json.loads(Path(sys.argv[1]).read_text())
for k in ('plain', 'tpl'):
    d[k].update(add.get(k, {}))
p.write_text(json.dumps(d, ensure_ascii=False, indent=0, sort_keys=True))
print(len(d['plain']), 'plain', len(d['tpl']), 'tpl')
