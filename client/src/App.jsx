import GlideSelect from './GlideSelect';
import { useEffect, useRef, useState } from 'react';
import FieldCanvas from './FieldCanvas.jsx';
import ProfilePage from './ProfilePage.jsx';
import useWorkspace from './useWorkspace.js';
import { TaskDialog } from './Dialogs.jsx';
import { dueLabel, priorityLabel, stations } from './taskPresentation.js';
import { pageAt, pages } from '../../shared/pages.js';
import PageFilm from './PageFilm.jsx';
import Planner from './Planner.jsx';
import WorkspaceMenu from './WorkspaceMenu.jsx';
import LandingPage from './LandingPage.jsx';
import Dashboard from './Dashboard.jsx';
import AuthPage from './AuthPage.jsx';

const taskType = 'application/taskflow';

function Mark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function Priority({ value }) {
  return <span className={'priority ' + value}><i />{priorityLabel(value)}</span>;
}

function StationRail({ active, navigate, move, groups, busy }) {
  const [dropTarget, setDropTarget] = useState(null);
  const buttons = useRef([]);

  function customKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = { ArrowLeft: Math.max(0, active - 1), ArrowRight: Math.min(2, active + 1), Home: 0, End: 2 }[event.key];
    navigate(target);
    buttons.current[target]?.focus();
  }

  return (
    <div className="station-rail" role="group" aria-label="Task stations" onKeyDown={customKeys}>
      {stations.map((station, index) => (
        <button
          type="button"
          key={station.id}
          ref={element => { buttons.current[index] = element; }}
          className={'station-button' + (dropTarget === index ? ' drop-target' : '')}
          aria-pressed={active === index}
          style={{ '--station': station.color }}
          onClick={() => navigate(index)}
          onDragOver={event => {
            if (!event.dataTransfer.types.includes(taskType)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTarget(index);
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);
          }}
          onDrop={event => {
            event.preventDefault();
            setDropTarget(null);
            const id = event.dataTransfer.getData(taskType);
            if (id) move(id, index);
          }}
        >
          <span className="station-node" aria-hidden="true"><i /></span>
          <span>{station.name}</span>
          {!busy && <span className="station-count" aria-label={groups[index].length + ' tasks'}>{groups[index].length}</span>}
        </button>
      ))}
    </div>
  );
}

function TaskInspector({ task, edit, move, moving }) {
  if (!task) return null;
  const destinations = stations.filter(station => station.id !== task.status)
    .map(station => ({ value: station.id, label: station.name }));
  return (
    <section className="inspector" aria-label="Selected task">
      <div className="inspector-kicker"><span>Selected task</span><Priority value={task.priority} /></div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <p className="inspector-due"><span>Due</span> {dueLabel(task.due_date)}</p>
      <div className="inspector-actions">
        <button className="text-action" onClick={() => edit(task)}>Edit details</button>
        <GlideSelect
          options={destinations}
          value=""
          ariaLabel="Move selected task"
          placeholder={moving === task.id ? 'Moving…' : 'Move to…'}
          disabled={moving === task.id}
          onChange={value => move(String(task.id), stations.findIndex(station => station.id === value))}
          align="right"
          size="lg"
          radius={7}
          menuWidth={170}
          accentColor="#496327"
          surfaceColor="var(--sheet)"
          highlightColor="#dcebbf"
          textColor="var(--ink)"
        />
      </div>
    </section>
  );
}

function Manifest({ active, tasks, selected, select, edit, busy, move, moving, create, follow }) {
  return (
    <aside className="manifest" aria-labelledby="manifest-title">
      <header className="manifest-head">
        <div className="manifest-label"><span>Station manifest</span><a className="text-action" href="/ledger" onClick={follow}>View all tasks</a></div>
        <h2 id="manifest-title">{stations[active].name}</h2>
      </header>
      {busy ? <p className="manifest-empty" role="status">Loading tasks…</p> : tasks.length === 0 ? (
        <div className="manifest-empty"><p>This station is empty.</p><button className="text-action" onClick={create}>Add a task</button></div>
      ) : (
        <ul className="manifest-list" aria-label="Tasks at this station">
          {tasks.map(task => (
            <li key={task.id}>
              <button className="task-row" aria-pressed={task.id === selected?.id}
                draggable onDragStart={event => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData(taskType, String(task.id));
                }} onClick={() => select(task.id)}>
                <span className={'row-tab ' + task.priority} aria-hidden="true" />
                <span className="row-title">{task.title}</span>
                <span className="row-date">{task.due_date ? dueLabel(task.due_date) : '—'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <TaskInspector task={busy ? null : selected} edit={edit} move={move} moving={moving} />
    </aside>
  );
}

function Ledger({ tasks, edit, busy, focusSearch, create }) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const input = useRef(null);
  const phrase = query.trim().toLowerCase();
  const filtered = tasks.filter(task => (!status || task.status === status) &&
    (!priority || task.priority === priority) &&
    (task.title + ' ' + (task.description || '')).toLowerCase().includes(phrase));

  useEffect(() => { if (focusSearch) input.current?.focus(); }, [focusSearch]);

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <header className="ledger-head"><h2 id="ledger-title">All tasks</h2><div className="ledger-controls">
        <label className="ledger-search"><span className="screen-reader">Search tasks</span><input ref={input} type="search" placeholder="Search tasks" value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></label>
        <label><span className="screen-reader">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{stations.map(station => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label>
        <label><span className="screen-reader">Filter by priority</span><select value={priority} onChange={event => setPriority(event.target.value)}><option value="">All priorities</option>{['high', 'medium', 'low'].map(level => <option value={level} key={level}>{priorityLabel(level)}</option>)}</select></label>
      </div></header>
      {busy ? <p className="ledger-empty" role="status">Loading tasks…</p> : filtered.length > 0 ? (
        <table className="ledger-table">
          <thead><tr><th scope="col">Task</th><th scope="col">Station</th><th scope="col">Priority</th><th scope="col">Due date</th></tr></thead>
          <tbody>{filtered.map(task => <tr key={task.id}>
            <td><button className="text-action" onClick={() => edit(task)}>{task.title}</button></td>
            <td>{stations.find(station => station.id === task.status)?.name}</td>
            <td><Priority value={task.priority} /></td>
            <td>{dueLabel(task.due_date)}</td>
          </tr>)}</tbody>
        </table>
      ) : <div className="ledger-empty"><p>{tasks.length ? 'No tasks match these filters.' : 'Your workspace is empty.'}</p>
        {tasks.length ? <button className="text-action" onClick={() => { setQuery(''); setPriority(''); setStatus(''); }}>Clear filters</button> : <button className="text-action" onClick={create}>Add a task</button>}
      </div>}
    </section>
  );
}

export default function App() {
  const workspace = useWorkspace();
  const { session, tasks, busy, error, mutate, retry } = workspace;
  const [active, setActive] = useState(1);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => pageAt(location.pathname)?.id ?? 'field');
  const [authMode, setAuthMode] = useState('login');
  const publicPage = view === 'landing' || view === 'auth' || view === 'profile';
  const focusPage = useRef(false);
  const [searchSignal, setSearchSignal] = useState(0);
  const [editor, setEditor] = useState(null);
  const [moving, setMoving] = useState(null);
  const movingRef = useRef(false);
  const [notice, setNotice] = useState(null);
  const groups = stations.map(station => tasks.filter(task => task.status === station.id));
  const focused = groups[active].find(task => task.id === selected) ?? groups[active][0];

  function navigate(index, taskId = null) {
    setActive(index);
    setSelected(taskId);
  }

  function create(date) {
    setEditor({ task: null, status: view === 'field' ? stations[active].id : 'todo', date: typeof date === 'string' ? date : undefined });
  }

  function openPage(page, shouldFocus = true) {
    if (!page || view === page.id) return;
    history.pushState(null, '', page.path);
    window.scrollTo(0, 0);
    focusPage.current = shouldFocus;
    setView(page.id);
  }

  function go(id) {
    setSearchSignal(0);
    openPage(pages.find(page => page.id === id));
  }

  function openAuth(mode) {
    setEditor(null);
    setAuthMode(mode);
    go('auth');
  }

  function follow(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const page = pageAt(new URL(event.currentTarget.href).pathname);
    if (!page) return;
    event.preventDefault();
    if (page.id !== view) setSearchSignal(0);
    openPage(page);
  }

  useEffect(() => {
    function onHistory() {
      focusPage.current = true;
      setSearchSignal(0);
      setView(pageAt(location.pathname)?.id ?? 'field');
    }
    window.addEventListener('popstate', onHistory);
    return () => window.removeEventListener('popstate', onHistory);
  }, []);

  useEffect(() => {
    document.title = 'Keystone | ' + pages.find(page => page.id === view).title;
    if (focusPage.current) document.getElementById('page-title')?.focus({ preventScroll: true });
    focusPage.current = false;
  }, [view]);

  useEffect(() => {
    function keys(event) {
      if (publicPage || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented || event.repeat ||
        document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
      if (event.key === '/') {
        event.preventDefault();
        openPage(pages.find(page => page.id === 'ledger'), false);
        setSearchSignal(value => value + 1);
      }
      if (event.key.toLowerCase() === 'n' && !busy) {
        event.preventDefault();
        setEditor({ task: null, status: view === 'field' ? stations[active].id : 'todo' });
      }
    }
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [active, busy, publicPage, view]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 4300);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function move(id, index) {
    const task = tasks.find(candidate => String(candidate.id) === id);
    const station = stations[index];
    if (!task || !station || task.status === station.id || movingRef.current) return;
    movingRef.current = true;
    setMoving(task.id);
    try {
      await mutate('PATCH', task.id, { status: station.id });
      navigate(index, task.id);
      setNotice({ text: 'Moved to ' + station.name });
    } catch (failure) {
      setNotice({ text: failure.message, error: true });
    } finally {
      movingRef.current = false;
      setMoving(null);
    }
  }

  async function save(task) {
    const previous = editor.task;
    const saved = await mutate(previous ? 'PATCH' : 'POST', previous?.id, task);
    if (view === 'field') navigate(stations.findIndex(station => station.id === task.status), saved?.id ?? previous?.id);
    setEditor(null);
    setNotice({ text: previous ? 'Task updated' : 'Task created' });
  }

  async function remove() {
    await mutate('DELETE', editor.task.id);
    setEditor(null);
    setNotice({ text: 'Task deleted' });
  }

  const edit = task => setEditor({ task });

  return (
    <>
      <header className="masthead">
        <a className="brand" href="/" onClick={follow} aria-label="Keystone home"><Mark />Keystone</a>
        <div className="masthead-actions">
          {(session?.user || !publicPage) && (
            <a className="account-link dashboard-link" href="/dashboard" onClick={follow}
              aria-current={view === 'dashboard' ? 'page' : undefined}>Dashboard</a>
          )}
          {(session?.user || !publicPage) && <WorkspaceMenu
            links={pages.filter(page => page.id !== 'auth' && (page.id !== 'profile' || session?.user))} view={view} follow={follow} />}
          {session?.user ? (
            <a className="account-link" href="/profile" onClick={follow} aria-current={view === 'profile' ? 'page' : undefined}>Profile</a>
          ) : session?.mode === 'hosted' ? (
            <a className="account-link" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a>
          ) : (
            <>
              <button className="account-link" onClick={() => openAuth('login')}>Sign in</button>
              <button className="product-primary" onClick={() => openAuth('register')}>Sign up</button>
            </>
          )}
        </div>
      </header>

      <main className="workspace">
        {view === 'field' && <header className="intro">
          <div><h1 id="page-title" tabIndex={-1}>Task board<span>.</span></h1><p>Move tasks from the queue to done.</p></div>
          <button className="new-task" onClick={create} disabled={busy}><span>New task</span><kbd>N</kbd></button>
        </header>}
        {!publicPage && !busy && !session?.user && <aside className="demo-banner">Demo workspace · Changes are saved in this browser. {session?.mode !== 'hosted' && <button className="text-action" onClick={() => openAuth('register')}>Create an account</button>}</aside>}
        {error && <div className="error-banner" role="status">{error} <button className="text-action" onClick={retry}>Retry</button></div>}

        {view === 'landing' ? (
          <LandingPage onExplore={go} onAuth={openAuth} session={session} />
        ) : view === 'auth' ? (
          <AuthPage key={authMode} workspace={workspace} initialMode={authMode} onComplete={() => go('landing')} />
        ) : view === 'dashboard' ? (
          <Dashboard tasks={tasks} edit={edit} create={create} busy={busy} onNavigate={go} user={session?.user} />
        ) : view === 'field' ? (
          <div className="workspace-grid">
            <section className="field" aria-labelledby="field-title">
              <div className="field-head">
                <h2 id="field-title"><span className="field-signal" />Task field</h2>
                <span className="field-instruction"><span className="desktop-hint">Select a platform or scroll to switch</span><span className="touch-hint">Tap a platform to switch</span></span>
              </div>
              <div className="scene">
                <FieldCanvas active={active} groups={busy ? [[], [], []] : groups} selected={focused?.id} onNavigate={navigate} onMove={move} />
                <div className="scene-corners" aria-hidden="true"><i /><i /><i /><i /></div>
              </div>
              <StationRail active={active} navigate={navigate} move={move} groups={groups} busy={busy} />
              <div className="field-footer"><span><i /> One crate per visible task</span><span className="desktop-hint">Drag a crate or task row to move it</span><span className="touch-hint">Select a task to move it</span></div>
            </section>
            <Manifest active={active} tasks={groups[active]} selected={focused} select={setSelected}
              edit={edit} busy={busy} move={move} moving={moving} create={create} follow={follow} />
          </div>
        ) : view === 'profile' ? (
          <ProfilePage session={session} deleteAccount={workspace.deleteAccount}
            signOut={() => { workspace.signOut(); go('landing'); }} openAuth={openAuth} />
        ) : view === 'ledger' ? (
          <div className="inner-page" key="ledger">
            <PageFilm scene="ledger" title="Task ledger" description="Search and edit work across every station." create={create} busy={busy} />
            <Ledger tasks={tasks} edit={edit} busy={busy} focusSearch={searchSignal} create={create} />
          </div>
        ) : (
          <div className="inner-page" key="planner">
            <PageFilm scene="planner" title="Deadline planner" description="See what’s due, look ahead, and put unscheduled work on the calendar." create={create} busy={busy} />
            <Planner tasks={tasks} edit={edit} busy={busy} create={create} />
          </div>
        )}
      </main>
      {editor && <TaskDialog task={editor.task} status={editor.status} date={editor.date} save={save} remove={remove} close={() => setEditor(null)} />}
      {notice && <div className={'toast' + (notice.error ? ' error' : '')} role={notice.error ? 'alert' : 'status'}>{notice.text}<button className="text-action" onClick={() => setNotice(null)}>Dismiss</button></div>}
    </>
  );
}
