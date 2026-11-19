import { fields, validateTask } from '../shared/tasks.js';

const deletedWorkspace = 'deleted';
const columns = 'id, title, description, status, priority, due_date, created_at, updated_at';
const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});
const fail = (error, status) => json({ error }, status);

function getUser(headers) {
  const id = headers.get('oai-authenticated-user-id');
  if (!id) return null;
  const email = headers.get('oai-authenticated-user-email') || '';
  let name = headers.get('oai-authenticated-user-full-name') || '';
  if (headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(name); } catch { name = ''; }
  }
  return { name: name || email.split('@')[0] || 'Member', email };
}

function insert(db, id, userId, task) {
  return db.prepare(`INSERT INTO tasks (id, user_id, ${fields.join(', ')})
    SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM workspaces WHERE user_id = ? AND seed_nonce <> ?
    ) RETURNING ${columns}`)
    .bind(id, userId, ...fields.map(field => task[field]), userId, deletedWorkspace);
}

async function initializeWorkspace(db, userId) {
  await db.prepare('INSERT OR IGNORE INTO workspaces (user_id, seed_nonce) VALUES (?, ?)')
    .bind(userId, crypto.randomUUID()).run();
}

async function readJson(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return { failure: fail('Expected JSON.', 415) };
  }
  const limit = 16 * 1024;
  const reader = request.body?.getReader();
  if (!reader) return { failure: fail('Invalid JSON.', 400) };
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        return { failure: fail('Request is too large.', 413) };
      }
      text += decoder.decode(value, { stream: true });
    }
    return { data: JSON.parse(text + decoder.decode()) };
  } catch {
    return { failure: fail('Invalid JSON.', 400) };
  }
}

export async function handleApi(request, env, path) {
  try {
    const user = getUser(request.headers);
    const userId = request.headers.get('oai-authenticated-user-id');
    const method = request.method;
    if (path === '/api/health' && method === 'GET') return json({ status: 'ok' });
    const db = env.DB;
    const origin = request.headers.get('Origin');
    if (method !== 'GET' && origin && origin !== new URL(request.url).origin) return fail('Invalid request origin.', 403);
    let accountDeleted = false;
    if (user) {
      const workspace = await db.prepare('SELECT seed_nonce FROM workspaces WHERE user_id = ?').bind(userId).first();
      accountDeleted = workspace?.seed_nonce === deletedWorkspace;
    }
    if (path === '/api/session' && method === 'GET') {
      return json({ mode: 'hosted', user: accountDeleted ? null : user, accountDeleted });
    }
    if (!user || accountDeleted) return fail('Sign in to access your workspace.', 401);
    if (path === '/api/account' && method === 'DELETE') {
      const { data: payload, failure } = await readJson(request);
      if (failure) return failure;
      if (payload?.confirmation !== 'DELETE') return fail('Type DELETE to confirm.', 400);
      await db.batch([
        db.prepare(`INSERT INTO workspaces (user_id, seed_nonce) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET seed_nonce = excluded.seed_nonce`).bind(userId, deletedWorkspace),
        db.prepare('DELETE FROM tasks WHERE user_id = ?').bind(userId),
      ]);
      return new Response(null, { status: 204 });
    }

    const match = /^\/api\/tasks(?:\/([^/]+))?$/.exec(path);
    if (!match) return fail('Endpoint not found.', 404);
    const id = match[1] ? decodeURIComponent(match[1]) : null;
    await initializeWorkspace(db, userId);

    if (method === 'GET' && !id) {
      const { results } = await db.prepare(`SELECT ${columns} FROM tasks WHERE user_id = ?
        ORDER BY created_at DESC, id ASC`).bind(userId).all();
      return json({ tasks: results });
    }
    if (method === 'DELETE' && id) {
      const result = await db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(id, userId).run();
      return result.meta.changes ? new Response(null, { status: 204 }) : fail('Task not found.', 404);
    }
    const patch = method === 'PATCH' && id;
    if (!patch && !(method === 'POST' && !id)) return fail('Method not allowed.', 405);
    const { data: input, failure } = await readJson(request);
    if (failure) return failure;
    const { task, error } = validateTask(input, Boolean(patch));
    if (error) return fail(error, 400);
    if (!patch) {
      const created = await insert(db, crypto.randomUUID(), userId, task).first();
      return created ? json({ task: created }, 201) : fail('Workspace unavailable.', 401);
    }
    const keys = Object.keys(task);
    if (!keys.length) return fail('Provide at least one task field.', 400);
    const updated = await db.prepare(`UPDATE tasks SET ${keys.map(key => key + ' = ?').join(', ')},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ? RETURNING ${columns}`)
      .bind(...keys.map(key => task[key]), id, userId).first();
    return updated ? json({ task: updated }) : fail('Task not found.', 404);
  } catch (error) {
    console.error(error);
    return fail('Could not complete the request. Try again.', 500);
  }
}
