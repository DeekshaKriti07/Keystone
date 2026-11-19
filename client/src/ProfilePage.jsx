import { useRef, useState } from 'react';

export default function ProfilePage({ session, deleteAccount, signOut, openAuth }) {
  const dialog = useRef(null);
  const [confirmation, setConfirmation] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const user = session?.user;
  const hosted = session?.mode === 'hosted';

  async function confirmDelete(event) {
    event.preventDefault();
    if (working || confirmation !== 'DELETE') return;
    setWorking(true);
    setError('');
    try {
      await deleteAccount(confirmation);
      dialog.current?.close();
      setDeleted(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="profile-page">
      <header className="intro"><div><h1 id="page-title" tabIndex={-1}>Profile<span>.</span></h1></div></header>
      {deleted || session?.accountDeleted ? (
        <div className="profile-panel">
          <p role="status">Your Keystone account and saved tasks have been deleted.</p>
          {hosted && <a className="product-secondary" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>}
        </div>
      ) : !user ? (
        <div className="profile-panel">
          <p>{session ? 'Sign in to view your profile.' : 'Loading your profile…'}</p>
          {hosted ? <a className="product-primary" href="/signin-with-chatgpt?return_to=%2Fprofile" target="_top">Sign in</a>
            : session && <button className="product-primary" onClick={() => openAuth('login')}>Sign in</button>}
        </div>
      ) : (
        <>
          <div className="profile-panel">
            <h2>Account details</h2>
            <dl>
              <dt>Name</dt><dd>{user.name}</dd>
              <dt>Email</dt><dd>{user.email || 'Unavailable'}</dd>
              <dt>Sign-in method</dt><dd>{hosted ? 'ChatGPT' : 'Email and password'}</dd>
            </dl>
            {hosted ? <a className="product-secondary" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>
              : <button className="product-secondary" onClick={signOut}>Sign out</button>}
          </div>
          <div className="profile-panel">
            <h2>Delete account</h2>
            <p>Permanently delete your Keystone account and all saved tasks.{hosted && ' You can still use your ChatGPT account.'}</p>
            <button className="profile-delete" onClick={() => {
              setConfirmation('');
              setError('');
              dialog.current.showModal();
            }}>Delete account</button>
          </div>
          <dialog ref={dialog} className="profile-dialog" aria-labelledby="confirm-delete-title"
            onCancel={event => { if (working) event.preventDefault(); }}>
            <form onSubmit={confirmDelete}>
              <h2 id="confirm-delete-title">Delete your Keystone account?</h2>
              <p>This permanently removes your saved tasks. You can’t undo it.</p>
              <label>Type DELETE to confirm
                <input value={confirmation} onChange={event => setConfirmation(event.target.value)}
                  autoComplete="off" spellCheck={false} disabled={working} />
              </label>
              {error && <p role="alert">{error}</p>}
              <div className="dialog-actions">
                <button type="button" className="product-secondary" disabled={working} onClick={() => dialog.current.close()}>Cancel</button>
                <button className="profile-delete" disabled={working || confirmation !== 'DELETE'}>{working ? 'Deleting…' : 'Delete my account'}</button>
              </div>
            </form>
          </dialog>
        </>
      )}
    </section>
  );
}
