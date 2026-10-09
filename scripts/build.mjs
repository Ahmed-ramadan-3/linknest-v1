import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])),
  );
  return files.flat();
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const result = await build({
  entryPoints: [join(root, 'src/main.tsx')],
  outdir: join(dist, 'assets'),
  entryNames: '[name]-[hash]',
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['es2022', 'chrome100', 'safari15', 'firefox100'],
  jsx: 'automatic',
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
  loader: { '.svg': 'dataurl' },
  legalComments: 'none',
  metafile: true,
  logLevel: 'info',
});

await cp(join(root, 'public'), dist, { recursive: true });

const outputs = Object.keys(result.metafile.outputs).map((file) => relative(dist, resolve(root, file)).replaceAll('\\', '/'));
const js = outputs.find((file) => file.endsWith('.js'));
const css = outputs.find((file) => file.endsWith('.css'));
if (!js || !css) throw new Error('Build did not produce both a script and a stylesheet');

const tags = `<link rel="stylesheet" href="./${css}" />\n    <script type="module" src="./${js}"></script>`;
const html = (await readFile(join(root, 'index.html'), 'utf8')).replace('<!--ASSETS-->', tags);
await writeFile(join(dist, 'index.html'), html);

const shell = (await walk(dist))
  .map((file) => relative(dist, file).replaceAll('\\', '/'))
  .filter((file) => file !== 'sw.js' && !file.endsWith('.map'));
const precache = ['./', ...shell.map((file) => `./${file}`)];
const version = createHash('sha256').update(precache.join('|')).update(await readFile(join(dist, js))).digest('hex').slice(0, 12);

const sw = (await readFile(join(dist, 'sw.js'), 'utf8'))
  .replaceAll('__VERSION__', version)
  .replaceAll('__PRECACHE__', JSON.stringify(precache));
if (sw.includes('__VERSION__') || sw.includes('__PRECACHE__')) throw new Error('Service worker placeholders were not replaced');
await writeFile(join(dist, 'sw.js'), sw);
// GitHub Pages: serve files as-is and keep the SPA fallback simple.
await writeFile(join(dist, '.nojekyll'), '');
console.log(`Built ${precache.length} files, version ${version}`);
