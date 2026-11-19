import { useEffect, useRef, useState } from 'react';

const motionQuery = '(prefers-reduced-motion: reduce)';

export default function VideoArt({ scene }) {
  const video = useRef(null);
  const [visible, setVisible] = useState(false);
  const [allowMotion, setAllowMotion] = useState(() => !matchMedia(motionQuery).matches);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = matchMedia(motionQuery);
    const update = event => setAllowMotion(!event.matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(video.current);
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    const player = video.current;
    if (allowMotion && visible) player.play().catch(() => setPlaying(false));
    else player.pause();
  }, [allowMotion, visible]);

  function toggle() {
    const player = video.current;
    if (!player.paused) {
      setAllowMotion(false);
      player.pause();
      return;
    }
    setAllowMotion(true);
    player.play().catch(() => setPlaying(false));
  }

  return (
    <>
      <video ref={video} className="film-video" src={'/motion/' + scene + '.mp4'}
        poster={'/motion/' + scene + '.jpg'} preload="none" muted loop playsInline disablePictureInPicture
        aria-hidden="true" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
      {!failed && <button className="film-control" type="button" onClick={toggle} aria-label={playing ? 'Pause motion' : 'Play motion'}>{playing ? 'Pause motion' : 'Play motion'}</button>}
    </>
  );
}
