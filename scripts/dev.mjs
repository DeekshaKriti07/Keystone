import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Ensure server/.env has JWT_SECRET and PORT
const envPath = join(root, 'server', '.env');
if (!existsSync(envPath)) {
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(envPath, `JWT_SECRET=${secret}\nPORT=5001\nHOST=127.0.0.1\n`, { mode: 0o600 });
  console.log('Generated server/.env with fresh JWT_SECRET');
}

const colors = { client: '\x1b[36m', server: '\x1b[33m', reset: '\x1b[0m' };

function run(name, cwd, command, args) {
  const child = spawn(command, args, {
    cwd: join(root, cwd),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = `${colors[name]}[${name}]${colors.reset}`;
  const pipe = (stream) => {
    stream.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        console.log(`${prefix} ${line}`);
      }
    });
  };

  pipe(child.stdout);
  pipe(child.stderr);

  child.on('exit', (code) => {
    console.log(`${prefix} exited with code ${code}`);
    if (code) cleanup(code);
  });

  return child;
}

const processes = [
  run('server', 'server', 'node', ['src/index.js']),
  run('client', 'client', process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)]),
];

function cleanup(code = 0) {
  for (const p of processes) {
    p.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => cleanup());
process.on('SIGTERM', () => cleanup());
