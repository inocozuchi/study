import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const AUDIO = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm|caf)$/i;
const FOLDERS = [
  { dir: 'bgm', file: 'tracks.json', key: 'tracks' },
  { dir: 'ambient', file: 'sounds.json', key: 'sounds' },
] as const;
type Folder = (typeof FOLDERS)[number];
type Entry = { file?: unknown; [k: string]: unknown };

/**
 * public/bgm・public/ambient の一覧（tracks.json・sounds.json）に、フォルダの中の音声ファイルを足す。
 * json に書いた順番・題名・設定が優先され、書かれていないファイルは後ろにファイル名順で並ぶ。
 * json にあってもファイルがない音（URL 以外）は外す。→ 音声ファイルをアップロードするだけで一覧に出る。
 */
function mergedManifest(root: string, f: Folder) {
  const folder = path.join(root, 'public', f.dir);
  let listed: Entry[] = [];
  try {
    const json = JSON.parse(fs.readFileSync(path.join(folder, f.file), 'utf8'));
    if (Array.isArray(json[f.key])) listed = json[f.key];
  } catch {
    /* json がない・壊れている → ファイルだけで作る */
  }
  const files = fs.existsSync(folder) ? fs.readdirSync(folder).filter((n) => AUDIO.test(n)).sort((a, b) => a.localeCompare(b, 'ja')) : [];
  const norm = (p: string) => p.replace(/^\.?\/?/, '').replace(new RegExp(`^${f.dir}/`), '');
  const entries = listed.filter((t) => t && typeof t.file === 'string' && (/^https?:\/\//.test(t.file) || files.includes(norm(t.file))));
  const known = new Set(entries.map((t) => norm(String(t.file))));
  for (const n of files) if (!known.has(n)) entries.push({ file: n });
  return { [f.key]: entries };
}

function audioManifests(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'audio-manifests',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    // 開発サーバー：一覧をその場で作って返す
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        const f = FOLDERS.find((x) => pathname.endsWith(`/${x.dir}/${x.file}`));
        if (!f) return next();
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(mergedManifest(root, f)));
      });
    },
    // ビルド：public をコピーし終えたあとで、一覧を書き換える
    closeBundle() {
      for (const f of FOLDERS) {
        const dir = path.join(outDir, f.dir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, f.file), JSON.stringify(mergedManifest(root, f), null, 2) + '\n');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), audioManifests()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  base: './',
  worker: { format: 'es' },
});
