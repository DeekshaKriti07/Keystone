import { v4 as uuid } from 'uuid';
import { getDb } from '../config/database.js';
import type { Workspace, WorkspaceMember, WorkspaceRole, User } from '../../../../packages/shared/src/types.js';

// ─── Row types ──────────────────────────────────────────────────────────────

interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface MemberRow {
  user_id: string;
  workspace_id: string;
  role: string;
  // joined user fields (optional)
  name?: string;
  email?: string;
  avatar_color?: string;
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function toMember(row: MemberRow): WorkspaceMember {
  const member: WorkspaceMember = {
    userId: row.user_id,
    workspaceId: row.workspace_id,
    role: row.role as WorkspaceRole,
  };
  if (row.name) {
    member.user = {
      id: row.user_id,
      name: row.name,
      email: row.email!,
      avatarColor: row.avatar_color!,
      createdAt: '',
    };
  }
  return member;
}

// ─── Prepared-statement helpers ─────────────────────────────────────────────

function stmts() {
  const db = getDb();
  return {
    findById: db.prepare<[string]>(
      'SELECT * FROM workspaces WHERE id = ?',
    ),
    findByUser: db.prepare<[string]>(
      `SELECT w.* FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = ?
       ORDER BY w.created_at ASC`,
    ),
    insert: db.prepare<[string, string, string]>(
      'INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)',
    ),
    addMember: db.prepare<[string, string, string]>(
      `INSERT OR IGNORE INTO workspace_members (user_id, workspace_id, role)
       VALUES (?, ?, ?)`,
    ),
    getMembers: db.prepare<[string]>(
      `SELECT wm.*, u.name, u.email, u.avatar_color
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = ?`,
    ),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function findById(id: string): Workspace | undefined {
  const row = stmts().findById.get(id) as WorkspaceRow | undefined;
  return row ? toWorkspace(row) : undefined;
}

export function findByUser(userId: string): Workspace[] {
  const rows = stmts().findByUser.all(userId) as WorkspaceRow[];
  return rows.map(toWorkspace);
}

export function create(name: string, ownerId: string): Workspace {
  const id = uuid();
  stmts().insert.run(id, name, ownerId);
  return findById(id)!;
}

export function addMember(userId: string, workspaceId: string, role: WorkspaceRole): void {
  stmts().addMember.run(userId, workspaceId, role);
}

export function getMembers(workspaceId: string): WorkspaceMember[] {
  const rows = stmts().getMembers.all(workspaceId) as MemberRow[];
  return rows.map(toMember);
}
