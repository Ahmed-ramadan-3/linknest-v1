import { context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.dev');
const port = Number(process.env.PORT) || 5173;

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, 'public'), out, { recursive: true });
// No service worker in development so edits are never served from a stale cache.
await writeFile(join(out, 'sw.js'), '// disabled in development\n');
const tags = '<link rel="stylesheet" href="./assets/main.css" />\n    <script type="module" src="./assets/main.js"></script>';
await writeFile(join(out, 'index.html'), (await readFile(join(root, 'index.html'), 'utf8')).replace('<!--ASSETS-->', tags));

const ctx = await context({
  entryPoints: [join(root, 'src/main.tsx')],
  outdir: join(out, 'assets'),
  entryNames: 'main',
  bundle: true,
  sourcemap: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  define: { __DEV__: 'true', 'process.env.NODE_ENV': '"development"' },
  logLevel: 'info',
});
await ctx.watch();
const { port: boundPort } = await ctx.serve({ servedir: out, port });
console.log(`LinkNest dev server: http://localhost:${boundPort}/`);
