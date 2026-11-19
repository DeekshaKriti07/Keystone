import db from './db.js';
import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import { requestIdentity, verifyToken } from './middleware/auth.js';
import { pages } from '../../shared/pages.js';
import { securityHeaders } from '../../shared/securityHeaders.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters.');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const client = fileURLToPath(new URL('../../client/dist/', import.meta.url));
const attempts = new Map();
const authWindow = 60_000;

app.disable('x-powered-by');
app.set('io', io);

io.use((socket, next) => {
  const identity = verifyToken(socket.handshake.auth?.token);
  if (!identity) return next(new Error('Unauthorized'));
  socket.data.identity = identity;
  next();
});
io.on('connection', socket => {
  const { user, expires } = socket.data.identity;
  socket.join(`user:${user.id}`);
  const timer = setTimeout(() => socket.disconnect(true), Math.min(expires - Date.now(), 2_147_483_647));
  socket.once('disconnect', () => clearTimeout(timer));
});

app.use((_req, res, next) => {
  res.set(securityHeaders);
  res.set('X-Frame-Options', 'DENY');
  next();
});

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/session', (req, res) => res.json({ mode: 'local', user: requestIdentity(req)?.user ?? null }));
app.use('/api/auth', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const bucket = attempts.get(req.ip);
  if (bucket && bucket.expires > now) {
    if (bucket.count >= 12) {
      res.set('Retry-After', String(Math.ceil((bucket.expires - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    }
    bucket.count++;
  } else {
    attempts.set(req.ip, { count: 1, expires: now + authWindow });
  }
  next();
}, authRoutes);
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of attempts) if (bucket.expires <= now) attempts.delete(ip);
}, authWindow).unref();

app.delete('/api/account', (req, res) => {
  const identity = requestIdentity(req);
  if (!identity) return res.status(401).json({ error: 'Sign in to manage your account.' });
  if (req.body?.confirmation !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(identity.user.id);
  io.in(`user:${identity.user.id}`).disconnectSockets(true);
  res.status(204).end();
});

app.use('/api/tasks', taskRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use(express.static(client));
app.get('/landing', (_req, res) => res.redirect('/'));
app.get(pages.map(page => page.path), (_req, res, next) => {
  res.sendFile('index.html', { root: client }, next);
});
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  console.error(error);
  res.status(500).json({ error: 'Could not complete the request. Try again.' });
});

const port = Number(process.env.PORT || 5000);
httpServer.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Keystone listening at http://localhost:${httpServer.address().port}`);
});
