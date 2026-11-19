import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';
import { handleApi } from '../worker/api.js';

async function verifyTaskFlow(request, userA, userB) {
  assert.equal((await request('/api/tasks', null)).status, 401);
  const initial = await request('/api/tasks', userA);
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).tasks.length, 0);
  const bad = await request('/api/tasks', userA, 'POST', { title: 'Invalid date', due_date: '2026-02-31' });
  assert.equal(bad.status, 400);
  const created = await request('/api/tasks', userA, 'POST', { title: '  Ship release  ', priority: 'high', due_date: '2026-12-01' });
  assert.equal(created.status, 201);
  const { task } = await created.json();
  assert.equal(task.title, 'Ship release');
  const path = '/api/tasks/' + encodeURIComponent(task.id);
  const otherBoard = await (await request('/api/tasks', userB)).json();
  assert.ok(otherBoard.tasks.every(item => item.id !== task.id));
  assert.equal((await request(path, userB, 'PATCH', { title: 'Wrong owner' })).status, 404);
  assert.equal((await request(path, userB, 'DELETE')).status, 404);
  const updated = await request(path, userA, 'PATCH', { status: 'done' });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).task.status, 'done');
  assert.equal((await request(path, userA, 'DELETE')).status, 204);
  const after = await (await request('/api/tasks', userA)).json();
  assert.ok(after.tasks.every(item => item.id !== task.id));
  assert.equal(after.tasks.length, 0);
}

async function verifyAccountDeletion(request, owner, other) {
  assert.equal((await request('/api/account', null, 'DELETE', { confirmation: 'DELETE' })).status, 401);
  assert.equal((await request('/api/account', owner, 'DELETE', { confirmation: 'wrong' })).status, 400);
  assert.equal((await request('/api/tasks', owner)).status, 200);
  const kept = await request('/api/tasks', other, 'POST', { title: 'Keep this task' });
  assert.equal(kept.status, 201);
  assert.equal((await request('/api/account', owner, 'DELETE', { confirmation: 'x'.repeat(17000) })).status, 413);
  assert.equal((await request('/api/account', owner, 'DELETE', { confirmation: 'DELETE' })).status, 204);
  assert.equal((await (await request('/api/session', owner)).json()).user, null);
  assert.equal((await request('/api/tasks', owner)).status, 401);
  assert.equal((await request('/api/tasks', owner, 'POST', { title: 'No new data' })).status, 401);
  const otherTasks = await (await request('/api/tasks', other)).json();
  assert.equal(otherTasks.tasks[0].title, 'Keep this task');
}

test('standalone registration, login, CRUD, owner isolation and private socket updates', { timeout: 15000 }, async t => {
  const server = spawn(process.execPath, ['src/index.js'], {
    cwd: new URL('../server/', import.meta.url),
    env: { ...process.env, JWT_SECRET: randomBytes(32).toString('hex'), TASKFLOW_DB: ':memory:', PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => server.kill());
  const [chunk] = await once(server.stdout, 'data');
  const port = /localhost:(\d+)/.exec(String(chunk))?.[1];
  assert.ok(port);
  const origin = 'http://localhost:' + port;
  const request = (path, token, method = 'GET', data) => fetch(origin + path, {
    method,
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  const password = 'generated-test-passphrase';
  const users = [];
  for (const [name, email] of [['First', 'first@example.test'], ['Second', 'second@example.test']]) {
    const result = await request('/api/auth/register', null, 'POST', { name, email, password });
    assert.equal(result.status, 201);
    const login = await request('/api/auth/login', null, 'POST', { email, password });
    assert.equal(login.status, 200);
    users.push((await login.json()).token);
  }
  const owner = io(origin, { auth: { token: users[0] }, reconnection: false });
  const other = io(origin, { auth: { token: users[1] }, reconnection: false });
  t.after(() => { owner.close(); other.close(); });
  await Promise.all([once(owner, 'connect'), once(other, 'connect')]);
  const event = once(owner, 'task:created');
  const leaks = [];
  other.on('task:created', task => leaks.push(task));
  await verifyTaskFlow(request, ...users);
  const [announced] = await event;
  assert.equal(announced.title, 'Ship release');
  assert.deepEqual(leaks, []);
  await verifyAccountDeletion(request, ...users);
});

test('hosted Worker CRUD checks identity and applies owner isolation with the D1 schema', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_taskflow.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          const statement = sqlite.prepare(sql);
          return {
            first: async () => statement.get(...params),
            all: async () => ({ results: statement.all(...params) }),
            run: () => ({ meta: statement.run(...params) }),
          };
        },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const request = (path, user, method = 'GET', data) => handleApi(new Request('https://taskflow.test' + path, {
    method,
    headers: { ...(user ? { 'oai-authenticated-user-id': user } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  }), { DB: db }, path);
  await verifyTaskFlow(request, 'owner', 'other');
  await verifyAccountDeletion(request, 'owner', 'other');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS total FROM tasks WHERE user_id = ?').get('owner').total, 0);
  sqlite.close();
});
