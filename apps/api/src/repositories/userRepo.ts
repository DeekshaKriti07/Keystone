import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '../config/database.js';
import type { User } from '../../../../packages/shared/src/types.js';

const SALT_ROUNDS = 12;

// ─── Row mapping ────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

// ─── Prepared-statement cache ───────────────────────────────────────────────

function stmts() {
  const db = getDb();
  return {
    findById: db.prepare<[string]>(
      'SELECT * FROM users WHERE id = ?',
    ),
    findByEmail: db.prepare<[string]>(
      'SELECT * FROM users WHERE email = ?',
    ),
    insert: db.prepare<[string, string, string, string, string]>(
      `INSERT INTO users (id, name, email, password_hash, avatar_color)
       VALUES (?, ?, ?, ?, ?)`,
    ),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function findById(id: string): (User & { passwordHash: string }) | undefined {
  const row = stmts().findById.get(id) as UserRow | undefined;
  if (!row) return undefined;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export function findByEmail(email: string): (User & { passwordHash: string }) | undefined {
  const row = stmts().findByEmail.get(email) as UserRow | undefined;
  if (!row) return undefined;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export async function create(
  name: string,
  email: string,
  password: string,
  avatarColor: string,
): Promise<User> {
  const id = uuid();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  stmts().insert.run(id, name, email, passwordHash, avatarColor);
  return { id, name, email, avatarColor, createdAt: new Date().toISOString() };
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
