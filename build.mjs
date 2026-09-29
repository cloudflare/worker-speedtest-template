// Builds dist/worker.js: the Worker script with the speed test page inlined.
// Requires esbuild and @cloudflare/speedtest to be installed.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const app = await build({
  entryPoints: ['page/app.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false
});
const script = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('page/index.html', 'utf8').replace('/*APP_SCRIPT*/', () => script);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);

await build({
  entryPoints: ['index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/worker.js',
  define: { __PAGE_HTML__: JSON.stringify(html) }
});
