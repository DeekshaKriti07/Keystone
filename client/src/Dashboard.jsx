import { useState } from 'react';
import GlassIcons from './GlassIcons';
import { stations, priorityLabel, dueLabel } from './taskPresentation.js';

const destinations = [
  { id: 'field', label: 'Open board', color: '#a9cc68', path: 'M3 5h18v14H3zM9 5v14m6-14v14' },
  { id: 'ledger', label: 'Task ledger', color: '#c4d5a6', path: 'M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h6' },
  { id: 'planner', label: 'Planner', color: '#a4bf99', path: 'M4 6h16v14H4zM4 10h16M8 4v4m8-4v4m-7 7h2m3 0h2' },
];

export default function Dashboard({ tasks, edit, create, busy, onNavigate, user }) {
  const [filter, setFilter] = useState('all');
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const overdue = task => task.status !== 'done' && task.due_date && task.due_date < todayKey;
  const upcoming = tasks.filter(task => task.status !== 'done' && task.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5);
  const counts = stations.map(station => tasks.filter(task => task.status === station.id).length);
  const recent = tasks.filter(task => filter === 'all' || task.status === filter).slice(0, 6);

  return (
    <div className="dashboard-container">
      <header className="intro">
        <div><h1 id="page-title" tabIndex={-1}>Dashboard<span>.</span></h1>
          <p>{user ? user.name + '’s workspace' : 'Demo dashboard with example tasks. Changes stay in this browser.'}</p></div>
        <div className="page-actions">
          <button className="new-task" onClick={create} disabled={busy}>New task <kbd>N</kbd></button>
        </div>
      </header>
      <nav className="dashboard-shortcuts" aria-label="Workspace shortcuts">
        <GlassIcons theme="light" size={56} gap={32} roundness={0.34} tilt={12}
          tint="#e7efda" tintOpacity={0.25} iconColor="#1b2119" hover="lift" labels="always"
          items={destinations.map(({ id, label, color, path }) => ({
            id, label, color, onClick: () => onNavigate(id),
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>,
          }))} />
      </nav>
      <dl className="overview-totals" aria-label="Task totals" aria-busy={busy}>
        {[...stations.map((station, index) => [station.name, counts[index]]), ['Overdue', tasks.filter(overdue).length]].map(([name, count]) => (
          <div key={name}><dt>{name}</dt><dd>{busy ? '–' : count}</dd></div>
        ))}
      </dl>
      <div className="overview-columns">
        <section className="overview-panel" aria-labelledby="recent-title">
          <header><h2 id="recent-title">Recent tasks</h2>
            <label><span className="screen-reader">Filter recent tasks by status</span>
              <select value={filter} onChange={event => setFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {stations.map(station => <option key={station.id} value={station.id}>{station.name}</option>)}
              </select>
            </label>
          </header>
          {busy ? <p role="status">Loading tasks…</p> : recent.length ? (
            <ul className="overview-list">{recent.map(task => <li key={task.id}>
              <button onClick={() => edit(task)}><strong>{task.title}</strong>
                <span>{stations.find(station => station.id === task.status)?.name} · {priorityLabel(task.priority)}</span></button>
            </li>)}</ul>
          ) : <p>{filter === 'all' ? 'Create your first task to get started.' : 'No tasks match this status.'}</p>}
          <button className="text-action" onClick={() => onNavigate('ledger')}>Open task ledger</button>
        </section>
        <section className="overview-panel" aria-labelledby="deadline-title">
          <header><h2 id="deadline-title">Deadlines</h2></header>
          {busy ? <p>Loading deadlines…</p> : upcoming.length ? (
            <ul className="overview-list">{upcoming.map(task => <li key={task.id}>
              <button onClick={() => edit(task)}><strong>{task.title}</strong>
                <span className={overdue(task) ? 'past-due' : undefined}>{dueLabel(task.due_date)}{overdue(task) ? ' · Overdue' : ''}</span></button>
            </li>)}</ul>
          ) : <p>No open tasks have a deadline.</p>}
          <button className="text-action" onClick={() => onNavigate('planner')}>Open planner</button>
        </section>
      </div>
    </div>
  );
}
