import { createHmac } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fields, validateTask } from '../shared/tasks.js';
import { securityHeaders } from '../shared/securityHeaders.js';

const columns = 'id, title, description, status, priority, due_date, created_at, updated_at';
const passwordCheck = bcrypt.hash('keystone timing placeholder', 12);

function inputBody(req) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (Buffer.byteLength(JSON.stringify(body ?? null)) > 16384) return null;
  return body;
}

async function identify(req, sql, secret) {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  let payload;
  try {
    payload = jwt.verify(auth.slice(7), secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  if (!Number.isSafeInteger(payload.sub)) return null;
  const [user] = await sql`SELECT id, name, email FROM users WHERE id = ${payload.sub}`;
  return user ?? null;
}

async function authenticate(req, res, sql, secret, register, body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || password.length < (register ? 8 : 1) || Buffer.byteLength(password) > 72
      || (register && (!name || name.length > 80))) {
    return res.status(400).json({ error: 'Enter valid account details.' });
  }
  const ip = req.headers['x-vercel-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown';
  const key = createHmac('sha256', secret).update(String(ip)).digest('hex');
  const bucket = Math.floor(Date.now() / 60000);
  const [limit] = await sql`INSERT INTO auth_limits (client_key, bucket, attempts) VALUES (${key}, ${bucket}, 1)
    ON CONFLICT (client_key) DO UPDATE SET
      attempts = CASE WHEN auth_limits.bucket = excluded.bucket THEN LEAST(auth_limits.attempts + 1, 13) ELSE 1 END,
      bucket = excluded.bucket
    RETURNING attempts`;
  if (limit.attempts > 12) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Try again in a minute.' });
  }

  let user;
  if (register) {
    const hash = await bcrypt.hash(password, 12);
    [user] = await sql`INSERT INTO users (name, email, password_hash) VALUES (${name}, ${email}, ${hash})
      ON CONFLICT (email) DO NOTHING RETURNING id, name, email`;
    if (!user) return res.status(409).json({ error: 'An account with that email already exists.' });
  } else {
    const [record] = await sql`SELECT id, name, email, password_hash FROM users WHERE email = ${email}`;
    const valid = await bcrypt.compare(password, record?.password_hash ?? await passwordCheck);
    if (!valid || !record) return res.status(401).json({ error: 'Incorrect email or password.' });
    user = { id: record.id, name: record.name, email: record.email };
  }
  const token = jwt.sign({ sub: user.id }, secret, { algorithm: 'HS256', expiresIn: '7d' });
  return res.status(register ? 201 : 200).json({ mode: 'vercel', user, token });
}

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value);
  res.setHeader('Cache-Control', 'no-store');
  const route = req.query.route;
  const method = req.method;
  const fail = (status, error) => res.status(status).json({ error });
  const secret = process.env.JWT_SECRET;
  if (!process.env.DATABASE_URL || !secret || secret.length < 32) return fail(503, 'Database or authentication configuration is missing.');
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (route === 'health' && method === 'GET') {
      await sql`SELECT 1 FROM users LIMIT 1`;
      return res.json({ status: 'ok' });
    }
    const writesBody = method === 'POST' || method === 'PATCH' || (route === 'account' && method === 'DELETE');
    if (writesBody && !req.headers['content-type']?.startsWith('application/json')) return fail(415, 'Expected JSON.');
    const body = writesBody ? inputBody(req) : undefined;
    if (body === null) return fail(400, 'Invalid or oversized request.');
    if (method === 'POST' && ['auth/login', 'auth/register'].includes(route)) {
      return await authenticate(req, res, sql, secret, route === 'auth/register', body);
    }
    const user = await identify(req, sql, secret);
    if (route === 'session' && method === 'GET') return res.json({ mode: 'vercel', user });
    if (!user) return fail(401, 'Sign in to access your workspace.');
    if (route === 'account' && method === 'DELETE') {
      if (body?.confirmation !== 'DELETE') return fail(400, 'Type DELETE to confirm.');
      await sql`DELETE FROM users WHERE id = ${user.id}`;
      return res.status(204).end();
    }

    const match = typeof route === 'string' && /^tasks(?:\/(\d+))?$/.exec(route);
    if (!match) return fail(404, 'Endpoint not found.');
    const id = match[1] ? Number(match[1]) : null;
    if (id !== null && (id < 1 || id > 2147483647)) return fail(404, 'Task not found.');
    if (method === 'GET' && id === null) {
      const tasks = await sql.query(`SELECT ${columns} FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC`, [user.id]);
      return res.json({ tasks });
    }
    if (method === 'DELETE' && id !== null) {
      const removed = await sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
      return removed.length ? res.status(204).end() : fail(404, 'Task not found.');
    }
    const patch = method === 'PATCH' && id !== null;
    if (!patch && !(method === 'POST' && id === null)) return fail(405, 'Method not allowed.');
    const { task, error } = validateTask(body, patch);
    if (error) return fail(400, error);
    if (!patch) {
      const [created] = await sql.query(`INSERT INTO tasks (user_id, ${fields.join(', ')})
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${columns}`, [user.id, ...fields.map(key => task[key])]);
      return res.status(201).json({ task: created });
    }
    const keys = fields.filter(key => Object.hasOwn(task, key));
    if (!keys.length) return fail(400, 'Provide at least one task field.');
    const assignments = keys.map((key, index) => `${key} = $${index + 3}`).join(', ');
    const [updated] = await sql.query(`UPDATE tasks SET ${assignments}, updated_at = now()
      WHERE id = $1 AND user_id = $2 RETURNING ${columns}`, [id, user.id, ...keys.map(key => task[key])]);
    return updated ? res.json({ task: updated }) : fail(404, 'Task not found.');
  } catch (error) {
    if (error instanceof SyntaxError) return fail(400, 'Invalid JSON.');
    console.error('Keystone API failure', error.code ?? error.name);
    return fail(500, 'Could not complete the request.');
  }
}
