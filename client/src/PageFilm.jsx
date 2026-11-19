import { lazy, Suspense } from 'react';
import VideoArt from './VideoArt.jsx';

const CinematicScene = lazy(() => import('./CinematicScene.jsx'));

export default function PageFilm({ scene, title, description, create, busy }) {
  return (
    <header className="page-film" data-scene={scene}>
      <div className="film-copy">
        <h1 id="page-title" tabIndex={-1}>{title}<span>.</span></h1>
        <p>{description}</p>
        <button className="film-create" onClick={create} disabled={busy}>New task <kbd>N</kbd></button>
      </div>
      <div className={'film-art' + (scene === 'ledger' ? ' ledger-cinematic' : '')}>
        {scene === 'ledger' ? <Suspense fallback={null}><CinematicScene variant="ledger" /></Suspense> : <VideoArt scene={scene} />}
      </div>
    </header>
  );
}
