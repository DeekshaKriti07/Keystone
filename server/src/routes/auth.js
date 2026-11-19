import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const byEmail = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
const addUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const dummyHash = bcrypt.hashSync('taskflow timing placeholder', 12);
function register(name, email, hash) {
  const { lastInsertRowid: id } = addUser.run(name, email, hash);
  return { id, name, email };
}

function response(user) {
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }),
  };
}

function credentials(input) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  return { email, password };
}

router.post('/register', async (req, res, next) => {
  const { email, password } = credentials(req.body);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter your name and a valid email address.' });
  }
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Choose a password of at least eight characters and no more than 72 bytes.' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    res.status(201).json(response(register(name, email, hash)));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = credentials(req.body);
  if (!email || email.length > 254 || !password || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }
  try {
    const user = byEmail.get(email);
    const valid = await bcrypt.compare(password, user?.password_hash || dummyHash);
    if (!user || !valid) return res.status(401).json({ error: 'Incorrect email or password.' });
    res.json(response(user));
  } catch (error) { next(error); }
});

export default router;
