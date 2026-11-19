export const statuses = ['todo', 'in_progress', 'done'];
export const priorities = ['low', 'medium', 'high'];
export const fields = ['title', 'description', 'status', 'priority', 'due_date'];

export function validateTask(input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Enter valid task details.' };
  }
  const defaults = { description: '', status: 'todo', priority: 'medium', due_date: null };
  const task = partial ? {} : { ...defaults };
  for (const key of fields) {
    if (Object.hasOwn(input, key)) task[key] = input[key];
  }
  if (!partial || 'title' in task) {
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.trim().length > 120) {
      return { error: 'Enter a title between 1 and 120 characters.' };
    }
    task.title = task.title.trim();
  }
  if ('description' in task && (typeof task.description !== 'string' || task.description.length > 1000)) {
    return { error: 'Keep the description under 1,001 characters.' };
  }
  if ('priority' in task && !priorities.includes(task.priority)) return { error: 'Choose a valid priority.' };
  if ('status' in task && !statuses.includes(task.status)) return { error: 'Choose a valid status.' };
  if ('due_date' in task && task.due_date !== null) {
    const value = task.due_date;
    const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? Date.parse(value + 'T00:00:00Z') : NaN;
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
      return { error: 'Choose a valid due date.' };
    }
  }
  return { task };
}

export function sampleTasks() {
  const examples = [
    ['Map the onboarding flow', 'Outline the steps from first visit to the first successful action.', 'todo', 'high', 2],
    ['Prepare sprint demo', 'Put together the walkthrough and capture key screens.', 'todo', 'medium', 4],
    ['Review mobile layouts', 'Check spacing and touch targets on smaller screens.', 'todo', 'low', 7],
    ['Build the dashboard', 'Bring progress, deadlines, and the board into one view.', 'in_progress', 'high', 1],
    ['Write API documentation', 'Document endpoints, request examples, and error responses.', 'in_progress', 'medium', 5],
    ['Set up project workspace', 'Initialize the project and organize the shared resources.', 'done', 'medium', -4],
    ['Define the visual direction', 'Choose a color palette, type system, and core components.', 'done', 'low', -2],
    ['Audit the task workflow', 'Check that every task has a clear status and owner.', 'done', 'low', -1],
  ];
  return examples.map(([title, description, status, priority, offset]) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    return { title, description, status, priority, due_date: date.toISOString().slice(0, 10) };
  });
}
