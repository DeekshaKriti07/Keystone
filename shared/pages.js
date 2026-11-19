export const pages = [
  { id: 'landing', path: '/', label: 'Home', title: 'Plan and track your work' },
  { id: 'field', path: '/board', label: 'Task board', title: 'Task board' },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', title: 'Dashboard' },
  { id: 'ledger', path: '/ledger', label: 'Task ledger', title: 'Task ledger' },
  { id: 'planner', path: '/planner', label: 'Planner', title: 'Deadline planner' },
  { id: 'profile', path: '/profile', label: 'Profile', title: 'Profile' },
  { id: 'auth', path: '/auth', label: 'Sign in', title: 'Account Access' },
];

export function pageAt(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/landing') return pages[0];
  return pages.find(page => page.path === path);
}
