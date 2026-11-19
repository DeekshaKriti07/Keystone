export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
export const TASK_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
export const TASK_FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'projectId'] as const;

export const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  todo: '#5b8def',
  in_progress: '#f0a830',
  review: '#a855f7',
  done: '#4a9d7c',
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high: '#d94f6b',
  medium: '#f0a830',
  low: '#6b7280',
};

export function validateTask(input: Record<string, unknown>, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Enter valid task details.' };
  }

  const task: Record<string, unknown> = partial
    ? {}
    : { description: '', status: 'todo', priority: 'medium', assigneeId: null, dueDate: null };

  for (const key of TASK_FIELDS) {
    if (key in input) task[key] = input[key];
  }

  if (!partial || 'title' in task) {
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.trim().length > 200) {
      return { error: 'Enter a title between 1 and 200 characters.' };
    }
    task.title = task.title.trim();
  }

  if ('description' in task && typeof task.description === 'string' && task.description.length > 5000) {
    return { error: 'Keep the description under 5,000 characters.' };
  }

  if ('priority' in task && !TASK_PRIORITIES.includes(task.priority as any)) {
    return { error: 'Choose a valid priority.' };
  }

  if ('status' in task && !TASK_STATUSES.includes(task.status as any)) {
    return { error: 'Choose a valid status.' };
  }

  if ('dueDate' in task && task.dueDate !== null) {
    const value = task.dueDate;
    const parsed =
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? Date.parse(value + 'T00:00:00Z')
        : NaN;
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
      return { error: 'Choose a valid due date.' };
    }
  }

  return { task };
}

export function generateAvatarColor(seed: string): string {
  const palette = [
    '#e85d3a', '#5b8def', '#4a9d7c', '#d94f6b', '#f0a830',
    '#a855f7', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function sampleTasks() {
  const examples = [
    ['Design the onboarding flow', 'Map every screen from first visit through the first completed task.', 'todo', 'high', 2],
    ['Build dashboard components', 'Create the progress cards, deadline widget, and activity chart.', 'todo', 'medium', 4],
    ['Implement drag-and-drop board', 'Wire up dnd-kit with optimistic updates and spring animations.', 'in_progress', 'high', 1],
    ['Write API documentation', 'Document all endpoints with request/response examples.', 'in_progress', 'medium', 5],
    ['Set up CI/CD pipeline', 'Configure GitHub Actions for lint, test, build, and deploy.', 'review', 'medium', 3],
    ['Create design token system', 'Define the color palette, type scale, spacing, and shadows.', 'done', 'high', -4],
    ['Set up project structure', 'Initialize monorepo with apps/web, apps/api, and packages/shared.', 'done', 'medium', -3],
    ['Configure authentication', 'JWT access + refresh tokens with bcrypt password hashing.', 'done', 'low', -1],
  ] as const;

  return examples.map(([title, description, status, priority, offset]) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    return {
      title,
      description,
      status,
      priority,
      dueDate: date.toISOString().slice(0, 10),
    };
  });
}

