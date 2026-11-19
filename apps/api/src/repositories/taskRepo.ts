import { v4 as uuid } from 'uuid';
import { getDb } from '../config/database.js';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../../../../packages/shared/src/types.js';

// ─── Row mapping ────────────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Prepared-statement cache ───────────────────────────────────────────────

function stmts() {
  const db = getDb();
  return {
    findByProject: db.prepare<[string]>(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC',
    ),
    findById: db.prepare<[string]>(
      'SELECT * FROM tasks WHERE id = ?',
    ),
    insert: db.prepare(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, due_date, position)
       VALUES (@id, @projectId, @title, @description, @status, @priority, @assigneeId, @dueDate, @position)`,
    ),
    delete: db.prepare<[string]>(
      'DELETE FROM tasks WHERE id = ?',
    ),
    maxPosition: db.prepare<[string, string]>(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM tasks WHERE project_id = ? AND status = ?',
    ),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function findByProject(projectId: string): Task[] {
  const rows = stmts().findByProject.all(projectId) as TaskRow[];
  return rows.map(toTask);
}

export function findById(id: string): Task | undefined {
  const row = stmts().findById.get(id) as TaskRow | undefined;
  return row ? toTask(row) : undefined;
}

export function create(input: CreateTaskInput): Task {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  const status = input.status ?? 'todo';

  // Position at the end of the status column
  const posRow = stmts().maxPosition.get(input.projectId, status) as { max_pos: number };
  const position = posRow.max_pos + 1;

  stmts().insert.run({
    id,
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? '',
    status,
    priority: input.priority ?? 'medium',
    assigneeId: input.assigneeId ?? null,
    dueDate: input.dueDate ?? null,
    position,
  });

  return findById(id)!;
}

export function update(id: string, input: UpdateTaskInput): Task | undefined {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (input.title !== undefined) { fields.push('title = @title'); values.title = input.title; }
  if (input.description !== undefined) { fields.push('description = @description'); values.description = input.description; }
  if (input.status !== undefined) { fields.push('status = @status'); values.status = input.status; }
  if (input.priority !== undefined) { fields.push('priority = @priority'); values.priority = input.priority; }
  if (input.assigneeId !== undefined) { fields.push('assignee_id = @assigneeId'); values.assigneeId = input.assigneeId; }
  if (input.dueDate !== undefined) { fields.push('due_date = @dueDate'); values.dueDate = input.dueDate; }
  if (input.position !== undefined) { fields.push('position = @position'); values.position = input.position; }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`).run(values);
  return findById(id)!;
}

export function remove(id: string): boolean {
  const result = stmts().delete.run(id);
  return result.changes > 0;
}

export function moveTask(
  id: string,
  status: TaskStatus,
  position: number,
): Task | undefined {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return undefined;

  db.prepare(
    `UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, position, id);

  return findById(id)!;
}
