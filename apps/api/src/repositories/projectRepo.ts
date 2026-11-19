import { v4 as uuid } from 'uuid';
import { getDb } from '../config/database.js';
import type { Project } from '../../../../packages/shared/src/types.js';

// ─── Row type ───────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

// ─── Prepared-statement helpers ─────────────────────────────────────────────

function stmts() {
  const db = getDb();
  return {
    findByWorkspace: db.prepare<[string]>(
      'SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at ASC',
    ),
    findById: db.prepare<[string]>(
      'SELECT * FROM projects WHERE id = ?',
    ),
    insert: db.prepare<[string, string, string, string]>(
      'INSERT INTO projects (id, workspace_id, name, color) VALUES (?, ?, ?, ?)',
    ),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function findByWorkspace(workspaceId: string): Project[] {
  const rows = stmts().findByWorkspace.all(workspaceId) as ProjectRow[];
  return rows.map(toProject);
}

export function findById(id: string): Project | undefined {
  const row = stmts().findById.get(id) as ProjectRow | undefined;
  return row ? toProject(row) : undefined;
}

export function create(workspaceId: string, name: string, color: string): Project {
  const id = uuid();
  stmts().insert.run(id, workspaceId, name, color);
  return findById(id)!;
}
