import { useState } from 'react';

export default function AuthPage({ workspace, onComplete, initialMode = 'login' }) {
  const { session, authenticate, signOut } = workspace;
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await authenticate(mode, payload);
      onComplete?.();
    } catch (failure) {
      setError(failure.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  }

  if (session?.mode === 'hosted' && !session.user) {
    return <section className="auth-box"><h1 id="page-title" tabIndex={-1}>Sign in</h1><p>Sign in through the hosting platform to access your workspace.</p></section>;
  }

  if (session?.user) {
    return (
      <div className="auth-page-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1 id="page-title" tabIndex={-1}>Welcome back, {session.user.name}</h1>
            <p className="auth-subtitle">Signed in with email: {session.user.email}</p>
          </div>
          <div className="auth-actions-group">
            <button className="product-primary" onClick={onComplete}>
              Open workspace
            </button>
            {session.mode === 'hosted' ? <a className="product-secondary" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a> : <button className="product-secondary" onClick={signOut}>
              Sign out
            </button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1 id="page-title" tabIndex={-1}>{mode === 'login' ? 'Sign in to Keystone' : 'Create your Keystone account'}</h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Access your private workspace, synchronized across all your devices.'
              : 'Create a private workspace to track your tasks.'}
          </p>
        </div>

        <form onSubmit={submit} className="auth-form" key={mode}>
          <fieldset disabled={busy} className="auth-fieldset">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Alex Vance"
                  maxLength={80}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Work Email</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="alex@company.com"
                maxLength={254}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                name="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                maxLength={72}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="••••••••••••"
              />
              {mode === 'register' && (
                <span className="form-hint">Minimum 8 characters</span>
              )}
            </div>
          </fieldset>

          {error && <div className="auth-error-message" role="alert">{error}</div>}

          <div className="auth-submit-row">
            <button className="product-primary full-width" disabled={busy} type="submit">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create account'}
            </button>
          </div>

          <div className="auth-switch-mode">
            {mode === 'login' ? (
              <p>
                Don’t have an account yet?{' '}
                <button
                  type="button"
                  className="text-action"
                  disabled={busy}
                  onClick={() => { setMode('register'); setError(''); }}
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-action"
                  disabled={busy}
                  onClick={() => { setMode('login'); setError(''); }}
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

