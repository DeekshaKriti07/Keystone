import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fields, validateTask } from '../../../shared/tasks.js';

const router = Router();
router.use(requireAuth);

const columns = 'id, title, description, status, priority, due_date, created_at, updated_at';
const select = db.prepare(`SELECT ${columns} FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC`);
const insert = db.prepare(`INSERT INTO tasks (user_id, ${fields.join(', ')})
  VALUES (?, ?, ?, ?, ?, ?) RETURNING ${columns}`);
const remove = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');

router.get('/', (req, res) => res.json({ tasks: select.all(req.userId) }));

router.post('/', (req, res) => {
  const { task: input, error } = validateTask(req.body);
  if (error) return res.status(400).json({ error });
  const task = insert.get(req.userId, ...fields.map(field => input[field]));
  req.app.get('io').to(`user:${req.userId}`).emit('task:created', task);
  res.status(201).json({ task });
});

router.patch('/:id', (req, res) => {
  const { task: input, error } = validateTask(req.body, true);
  if (error) return res.status(400).json({ error });
  const keys = Object.keys(input);
  if (!keys.length) return res.status(400).json({ error: 'Provide at least one task field.' });
  const task = db.prepare(`UPDATE tasks SET ${keys.map(key => key + ' = ?').join(', ')},
    updated_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING ${columns}`)
    .get(...keys.map(key => input[key]), req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  req.app.get('io').to(`user:${req.userId}`).emit('task:updated', task);
  res.json({ task });
});

router.delete('/:id', (req, res) => {
  if (!remove.run(req.params.id, req.userId).changes) return res.status(404).json({ error: 'Task not found.' });
  req.app.get('io').to(`user:${req.userId}`).emit('task:deleted', { id: Number(req.params.id) });
  res.status(204).end();
});

export default router;
