import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import VideoArt from './VideoArt.jsx';
import { vertexShader, fragmentShader } from './flowShaders.js';

function buildStage(scene, ledger) {
  const stage = new THREE.Group();
  scene.add(stage);

  const box = new THREE.BoxGeometry();
  const stone = new THREE.MeshStandardMaterial({ color: '#37473a', metalness: .38, roughness: .53 });
  const lacquer = new THREE.MeshStandardMaterial({ color: '#cde989', metalness: .18, roughness: .32 });
  const panel = new THREE.MeshStandardMaterial({ color: '#eef0dc', roughness: .5 });
  const ink = new THREE.MeshStandardMaterial({ color: '#344635', roughness: .7 });
  const light = new THREE.MeshBasicMaterial({ color: '#c9fc75' });

  function block(parent, material, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }

  for (let station = 0; station < 3; station++) {
    const x = (station - 1) * 3.35;
    const z = ledger ? 0 : -station * 1.4;
    block(stage, stone, x, -.4, z, 2.8, .66, 3.55);
    block(stage, station === 2 ? lacquer : ink, x, -.04, z, 2.7, .08, 3.45);
    block(stage, light, x, -.32, z + 1.78, 2.35, .025, .03);
    for (let rail = -1; rail <= 1; rail += 2) {
      block(stage, stone, x, .04, z + rail * 1.42, 2.52, .032, .025);
    }
    if (station < 2) {
      block(stage, stone, x + 1.68, -.22, z - (ledger ? 0 : .7), .57, .15, 1.1);
    }
  }

  function card(material) {
    const group = new THREE.Group();
    stage.add(group);
    block(group, stone, 0, 0, 0, 1.81, .105, 1.15);
    block(group, material, 0, .059, 0, 1.74, .028, 1.08);
    block(group, ink, -.23, .08, -.22, 1.01, .012, .075);
    block(group, ink, -.36, .08, .04, .74, .012, .045);
    block(group, ink, -.47, .08, .24, .52, .012, .045);
    block(group, lacquer, .58, .08, .26, .21, .012, .14);
    return group;
  }

  const records = [card(panel), card(panel), card(lacquer)];
  records[0].position.set(-3.35, .15, -.45);
  records[1].position.set(0, .15, ledger ? -.48 : -1.8);
  const moving = records[2];

  return time => {
    const progress = (time / (ledger ? 7 : 10) + .08) % 1;
    const step = Math.min(2, Math.floor(progress * 3));
    const transfer = THREE.MathUtils.smoothstep(progress * 3 - step, .30, 1);
    const position = step < 2 ? step + transfer : 2;
    const arrival = Math.sin(Math.PI * transfer);
    moving.scale.setScalar(step === 2 ? 1 - THREE.MathUtils.smoothstep(transfer, .40, 1) * .999 : 1);
    moving.position.set((position - 1) * 3.35, .18 + (step < 2 ? .9 * arrival : 0), .58 - (ledger ? 0 : 1.4 * position));
    moving.rotation.y = step < 2 ? -.36 * arrival : 0;
  };
}

function buildWave(scene) {
  const surface = new THREE.PlaneGeometry(12, 7, 125, 74);
  surface.rotateX(-Math.PI / 2);
  const values = {
    uTime: 0, uStream: 0, uSize: 2.6, uWaveHeight: 2.4, uFlow: 1, uScale: .33,
    uRepelRadius: 4, uRepelStrength: 0, uActivity: 0, uOpacity: .65, uBrightness: 1, uAppear: 1,
    uColLow: new THREE.Color('#345140'), uColHigh: new THREE.Color('#a8da73'), uCursor: new THREE.Vector3(),
  };
  const uniforms = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]));
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const wave = new THREE.Points(surface, material);
  wave.position.y = -2.6;
  wave.frustumCulled = false;
  scene.add(wave);
  return time => {
    uniforms.uTime.value = time;
    uniforms.uStream.value = time * 2.8;
  };
}

export default function CinematicScene({ variant = 'home' }) {
  const host = useRef(null);
  const canvas = useRef(null);
  const controls = useRef(null);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const element = host.current;
    const screen = canvas.current;
    const ledger = variant === 'ledger';
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let stationary = media.matches;
    let visible = true;
    let lost = false;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: screen, alpha: true, antialias: true });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 120);
    scene.add(new THREE.HemisphereLight('#f4f4d9', '#273e27', 1.8));
    const key = new THREE.DirectionalLight('#f2ffd7', 2);
    key.position.set(-5, 9, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#b3e578', 1.2);
    rim.position.set(3, 2, -7);
    scene.add(rim);
    const updateStage = buildStage(scene, ledger);
    const updateWave = ledger ? null : buildWave(scene);
    const pointer = new THREE.Vector2();
    const drift = new THREE.Vector2();
    let frame = 0;
    let previous = 0;
    let time = ledger ? 1.25 : 1.4;

    function render(now) {
      const running = visible && !document.hidden && !stationary;
      if (running && previous) time += Math.min(.04, (now - previous) / 1000);
      previous = now;
      drift.lerp(pointer, .045);
      updateStage(time);
      updateWave?.(time);
      const orbit = time * .32;
      const narrow = camera.aspect < 1.05;
      if (ledger) {
        camera.position.set(7.4 + Math.sin(orbit) * 1.6, 8.1, 11.3 + (narrow ? 5 : 0));
        camera.lookAt(0, 0, 0);
      } else {
        const distance = narrow ? 21 : 17;
        camera.position.set(8 + Math.sin(orbit) * 3.2 + drift.x * 1.4,
          7.6 + Math.cos(orbit) * 1.45 + drift.y * .7, distance + Math.cos(orbit) * 2.1);
        camera.lookAt(narrow ? 0 : -4, 0, narrow ? .35 : -2.2);
      }
      renderer.render(scene, camera);
      if (running) frame = requestAnimationFrame(render);
    }
    function wake() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!lost) frame = requestAnimationFrame(render);
    }
    function resize() {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      wake();
    }
    function updateMotion(value) {
      stationary = value;
      setPaused(value);
      wake();
    }
    function preferenceChanged(event) { updateMotion(event.matches); }
    function move(event) {
      if (stationary || event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    }
    function leave() { pointer.set(0, 0); }
    function contextLost() {
      lost = true;
      cancelAnimationFrame(frame);
      setReady(false);
      setFallback(true);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
    const dimensions = new ResizeObserver(resize);
    observer.observe(element);
    dimensions.observe(element);
    const interaction = element.closest('header') ?? element;
    interaction.addEventListener('pointermove', move);
    interaction.addEventListener('pointerleave', leave);
    screen.addEventListener('webglcontextlost', contextLost);
    media.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', wake);
    controls.current = updateMotion;
    resize();
    setReady(true);
    return () => {
      controls.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      dimensions.disconnect();
      interaction.removeEventListener('pointermove', move);
      interaction.removeEventListener('pointerleave', leave);
      screen.removeEventListener('webglcontextlost', contextLost);
      media.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', wake);
      const resources = new Set();
      scene.traverse(object => {
        if (object.geometry) resources.add(object.geometry);
        if (object.material) resources.add(object.material);
      });
      resources.forEach(resource => resource.dispose());
      renderer.dispose();
    };
  }, [variant]);

  return (
    <div className="cinematic-scene" ref={host}>
      <canvas ref={canvas} aria-hidden="true" hidden={!ready} />
      {fallback && <VideoArt scene={variant === 'ledger' ? 'ledger-cinematic' : 'workspace-cinematic'} />}
      {ready && <button type="button" className="film-control" onClick={() => controls.current?.(!paused)}>
        {paused ? 'Play motion' : 'Pause motion'}
      </button>}
    </div>
  );
}
