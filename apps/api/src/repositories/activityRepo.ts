import { v4 as uuid } from 'uuid';
import { getDb } from '../config/database.js';
import type { ActivityLog, ActivityAction } from '../../../../packages/shared/src/types.js';

// ─── Row type ───────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  detail: string;
  timestamp: string;
  // joined user fields
  name?: string;
  avatar_color?: string;
}

function toActivityLog(row: ActivityRow): ActivityLog {
  const log: ActivityLog = {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    action: row.action as ActivityAction,
    detail: row.detail,
    timestamp: row.timestamp,
  };
  if (row.name) {
    log.user = {
      id: row.user_id,
      name: row.name,
      email: '',
      avatarColor: row.avatar_color ?? '',
      createdAt: '',
    };
  }
  return log;
}

// ─── Prepared-statement helpers ─────────────────────────────────────────────

function stmts() {
  const db = getDb();
  return {
    findByTask: db.prepare<[string]>(
      `SELECT al.*, u.name, u.avatar_color
       FROM activity_logs al
       JOIN users u ON u.id = al.user_id
       WHERE al.task_id = ?
       ORDER BY al.timestamp DESC`,
    ),
    insert: db.prepare<[string, string, string, string, string]>(
      `INSERT INTO activity_logs (id, task_id, user_id, action, detail)
       VALUES (?, ?, ?, ?, ?)`,
    ),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function findByTask(taskId: string): ActivityLog[] {
  const rows = stmts().findByTask.all(taskId) as ActivityRow[];
  return rows.map(toActivityLog);
}

export function create(
  taskId: string,
  userId: string,
  action: ActivityAction,
  detail: string,
): ActivityLog {
  const id = uuid();
  stmts().insert.run(id, taskId, userId, action, detail);
  return {
    id,
    taskId,
    userId,
    action,
    detail,
    timestamp: new Date().toISOString(),
  };
}
