import { useEffect, useRef, useState } from 'react';
import { validateTask } from '../../shared/tasks.js';

function Dialog({ children, close, title, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    dialog.querySelector('input')?.focus();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) close(); }}
      onClick={event => { if (event.target === ref.current && !busy) close(); }}>
      <div className="dialog-inner">
        <header><h2 id="dialog-title">{title}</h2><button className="text-action" type="button" disabled={busy} onClick={close}>Close</button></header>
        {children}
      </div>
    </dialog>
  );
}

export function TaskDialog({ task, status, date, save, remove, close }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  async function action(fn) {
    setBusy(true);
    setError('');
    try { await fn(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  function submit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.due_date ||= null;
    const result = validateTask(payload);
    if (result.error) return setError(result.error);
    void action(() => save(result.task));
  }

  return (
    <Dialog title={task ? 'Edit task' : 'New task'} close={close} busy={busy}>
      {confirm ? <div className="confirm">
        <p>Delete “{task.title}” from your board?</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button className="button secondary-button" onClick={() => { setConfirm(false); setError(''); }} disabled={busy}>Keep task</button><button className="button danger" disabled={busy} onClick={() => action(remove)}>{busy ? 'Deleting…' : 'Delete task'}</button></div>
      </div> : <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>Task title<input name="title" required maxLength={120} defaultValue={task?.title} placeholder="Name your task" /></label>
          <label>Description <span>(optional)</span><textarea name="description" maxLength={1000} defaultValue={task?.description} rows={3} placeholder="Add relevant details" /></label>
          <div className="form-grid">
            <label>Status<select name="status" defaultValue={task?.status || status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
            <label>Priority<select name="priority" defaultValue={task?.priority || 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          </div>
          <label>Due date <span>(optional)</span><input name="due_date" type="date" defaultValue={task?.due_date || date || ''} /></label>
        </fieldset>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          {task && <button type="button" className="button delete-link" disabled={busy} onClick={() => { setConfirm(true); setError(''); }}>Delete</button>}
          <button type="button" className="button secondary-button" disabled={busy} onClick={close}>Cancel</button>
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>}
    </Dialog>
  );
}
