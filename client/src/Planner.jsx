import { useState } from 'react';
import { dueLabel, priorityLabel, stations } from './taskPresentation.js';

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const fullDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shift(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  result.setDate(result.getDate() + amount);
  return result;
}

function weekOf(date) {
  return shift(date, -((date.getDay() + 6) % 7));
}

export default function Planner({ tasks, edit, busy, create }) {
  const [today] = useState(() => new Date());
  const [start, setStart] = useState(() => weekOf(today));
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState('day');
  const todayKey = dateKey(today);
  const selectedKey = dateKey(selected);
  const days = Array.from({ length: 7 }, (_, index) => shift(start, index));
  const byDate = new Map();
  for (const task of tasks) {
    if (task.due_date) {
      const group = byDate.get(task.due_date) ?? [];
      group.push(task);
      byDate.set(task.due_date, group);
    }
  }
  const listed = view === 'day' ? byDate.get(selectedKey) ?? [] : view === 'overdue'
    ? tasks.filter(task => task.due_date && task.due_date < todayKey && task.status !== 'done')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
    : tasks.filter(task => !task.due_date);

  function moveWeek(amount) {
    setStart(previous => shift(previous, amount));
    setSelected(previous => shift(previous, amount));
    setView('day');
  }

  function jumpToday() {
    setStart(weekOf(today));
    setSelected(today);
    setView('day');
  }

  return (
    <section className="planner" aria-labelledby="schedule-heading">
      <header className="schedule-header">
        <h2 id="schedule-heading">Schedule</h2>
        <div className="week-steppers" aria-label="Week navigation">
          <button type="button" onClick={() => moveWeek(-7)}>Previous week</button>
          <button type="button" onClick={jumpToday}>Today</button>
          <button type="button" onClick={() => moveWeek(7)}>Next week</button>
        </div>
      </header>
      <div className="week-band">
        <p aria-live="polite">{shortDate.format(days[0])} – {shortDate.format(days[6])}, {days[6].getFullYear()}</p>
        <div className="week-days" role="group" aria-label="Choose a day">
          {days.map(day => {
            const key = dateKey(day);
            const count = byDate.get(key)?.length ?? 0;
            return (
              <button key={key} type="button" aria-pressed={view === 'day' && key === selectedKey}
                aria-current={key === todayKey ? 'date' : undefined}
                aria-label={fullDate.format(day) + (busy ? '' : `, ${count} ${count === 1 ? 'task' : 'tasks'}`)}
                onClick={() => { setSelected(day); setView('day'); }}>
                <span>{weekday.format(day)}</span><strong>{day.getDate()}</strong>
                {!busy && <small>{count ? count + (count === 1 ? ' task' : ' tasks') : '—'}</small>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="schedule-body">
        <header className="day-header">
          <h3 aria-live="polite">{view === 'day' ? fullDate.format(selected) : view === 'overdue' ? 'Overdue tasks' : 'Unscheduled tasks'}</h3>
          <div className="day-filters" role="group" aria-label="Show tasks by date">
            <button aria-pressed={view === 'overdue'} onClick={() => setView(view === 'overdue' ? 'day' : 'overdue')}>Overdue</button>
            <button aria-pressed={view === 'unscheduled'} onClick={() => setView(view === 'unscheduled' ? 'day' : 'unscheduled')}>Unscheduled</button>
            {view === 'day' && <button className="schedule-create" onClick={() => create(selectedKey)} disabled={busy}>Schedule task</button>}
          </div>
        </header>
        {busy ? <p className="schedule-empty" role="status">Loading tasks…</p> :
          listed.length === 0 ? <div className="schedule-empty">
            <p>{view === 'day' ? 'Nothing due on this date.' : view === 'overdue' ? 'No overdue tasks.' : 'Every task has a due date.'}</p>
          </div> : (
            <ul className="schedule-list">{listed.map(task => (
              <li key={task.id}>
                <button className="schedule-task" onClick={() => edit(task)}>
                  <span className="agenda-title">{task.title}</span>
                  <span className="agenda-station">{stations.find(station => station.id === task.status)?.name}</span>
                  <span className={'priority ' + task.priority}><i />{priorityLabel(task.priority)}</span>
                  {task.due_date && <time dateTime={task.due_date}>{dueLabel(task.due_date)}</time>}
                </button>
              </li>
            ))}</ul>
          )}
      </div>
    </section>
  );
}
