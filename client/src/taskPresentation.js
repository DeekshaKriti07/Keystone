export const stations = [
  { id: 'todo', name: 'To do', color: '#a3b0b3' },
  { id: 'in_progress', name: 'In progress', color: '#d3f877' },
  { id: 'done', name: 'Done', color: '#87c9b5' },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function dueLabel(due) {
  if (!due) return 'No due date';
  const date = new Date(due + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? due : dateFormatter.format(date);
}

export function priorityLabel(priority) {
  return { low: 'Low', medium: 'Medium', high: 'High' }[priority] || 'Medium';
}
