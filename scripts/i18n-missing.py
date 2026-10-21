"""
英語の辞書（src/i18n/en.json）にまだない日本語の文言を一覧にする。

  python3 scripts/i18n-missing.py            足りない文言を表示（plain＝そのままの文字、tpl＝値の入る型 {0}）
  python3 scripts/i18n-missing.py out.json   足りない文言を json に書き出す（訳して en.json に足す）

文言は JSX の文字・文字列・テンプレート文字列から拾う（コメントは除く）。列車の駅名は路線のデータから実行時に作るので除く。
"""
import re, os, json, sys
from pathlib import Path
root=str(Path(__file__).resolve().parent.parent / 'src')
JP=re.compile(r'[぀-ヿ㐀-鿿！-｠　-〿]')
plain={}; tpl={}
for dp,dn,fn in os.walk(root):
    for f in fn:
        if not f.endswith(('.ts','.tsx')): continue
        p=os.path.join(dp,f); rel=os.path.relpath(p,root)
        if rel.endswith(('train/booking/line.ts', 'lib/i18n.ts')): continue
        s=open(p).read()
        s2=re.sub(r'\{/\*.*?\*/\}', '', s, flags=re.S)
        s2=re.sub(r'/\*.*?\*/', '', s2, flags=re.S)
        s2=re.sub(r'(?m)^\s*//.*$', '', s2)
        s2=re.sub(r'(?m)(?<=[;,)}\]])\s*//.*$', '', s2)
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", s2):
            if m.group(3) is not None:
                t=m.group(3)
                if not JP.search(t): continue
                parts=re.split(r'\$\{(?:[^{}]|\{[^{}]*\})*\}', t)
                if len(parts)==1:
                    plain.setdefault(t.strip(),rel); continue
                i=[0]
                def rep(mm):
                    k=i[0]; i[0]+=1; return '{%d}'%k
                tt=re.sub(r'\$\{(?:[^{}]|\{[^{}]*\})*\}', rep, t).strip()
                tpl.setdefault(tt,rel)
            else:
                t=(m.group(1) if m.group(1) is not None else m.group(2)).strip()
                if JP.search(t): plain.setdefault(t,rel)
        for m in re.finditer(r'(?:>|\})([^<>{}`]+)(?=<|\{)', s2):
            t=m.group(1).strip()
            if JP.search(t) and '=' not in t and ';' not in t: plain.setdefault(t,rel)
en=json.load(open(os.path.join(root,'i18n','en.json')))
miss={'plain':{k:v for k,v in plain.items() if k not in en['plain'] and '$' not in k},'tpl':{k:v for k,v in tpl.items() if k not in en['tpl'] and '$' not in k}}
if len(sys.argv)>1: json.dump(miss, open(sys.argv[1],'w'), ensure_ascii=False, indent=1)
for kind in ('plain','tpl'):
    for k,v in miss[kind].items(): print(f'{kind}\t{v}\t{k}')
print(len(miss['plain']),'plain',len(miss['tpl']),'tpl missing')
