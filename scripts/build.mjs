import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../client/node_modules/esbuild/lib/main.js';

const output = 'dist';
rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'server'), { recursive: true });
const manifest = '.openai/hosting.json';
mkdirSync(join(output, '.openai'), { recursive: true });
cpSync(manifest, join(output, manifest));

const files = {};
function collect(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const key = prefix + '/' + entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, key);
    else {
      const bytes = readFileSync(path);
      files[key] = /\.(mp4|jpg)$/.test(key)
        ? { base64: bytes.toString('base64'), length: bytes.length }
        : bytes.toString('utf8');
    }
  }
}
collect('client/dist');

await build({
  entryPoints: ['worker/index.js'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  plugins: [{
    name: 'taskflow-assets',
    setup(builder) {
      builder.onResolve({ filter: /assets\.generated\.js$/ }, () => ({ path: 'assets', namespace: 'taskflow' }));
      builder.onLoad({ filter: /^assets$/, namespace: 'taskflow' }, () => ({
        contents: 'export const assets = ' + JSON.stringify(files),
        loader: 'js',
      }));
    },
  }],
});
