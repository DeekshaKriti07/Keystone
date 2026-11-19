import { lazy, Suspense } from 'react';
import TechText from './TechText';

const CinematicScene = lazy(() => import('./CinematicScene.jsx'));

export default function LandingPage({ onExplore, onAuth, session }) {
  const signedIn = Boolean(session?.user);
  return (
    <div className="landing-page">
      <header className="page-film landing-wave cinematic-home">
        <div className="film-copy">
          {!signedIn && <div className="landing-wordmark" aria-hidden="true">
            <TechText text="Keystone" align="left" color="#f7f6ee" accentColor="#d3f877"
              fontSize={82} fontWeight={650} intro="none" reveal="letter" guides={false}
              labels={false} selection={false} draggable={false} clickKick={false} specks={6} />
          </div>}
          <h1 id="page-title" tabIndex={-1}>{signedIn ? 'Welcome, ' + session.user.name.split(' ')[0] : 'Make time for what matters'}<span>.</span></h1>
          <p>Keystone gives you one place to organize tasks, plan deadlines, and see your progress.</p>
          <div className="page-actions">
            {signedIn ? (
              <button className="product-primary" onClick={() => onExplore('dashboard')}>Open dashboard</button>
            ) : (
              <>
                {session?.mode === 'hosted' ? (
                  <a className="product-primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a>
                ) : (
                  <button className="product-primary" onClick={() => onAuth('register')}>Get started</button>
                )}
                <button className="product-secondary" onClick={() => onExplore('dashboard')}>Try the demo</button>
              </>
            )}
          </div>
        </div>
        <div className="film-art wave-art">
          <Suspense fallback={null}><CinematicScene /></Suspense>
        </div>
      </header>
    </div>
  );
}
