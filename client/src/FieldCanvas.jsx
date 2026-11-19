import { useEffect, useRef } from 'react';
import { stations } from './taskPresentation.js';

const positions = [-6.3, 0, 6.3];
const pallets = [
  { x: -1.48, z: -1.05 }, { x: .66, z: -.95 },
  { x: -1.05, z: .92 }, { x: 1.05, z: 1.03 },
];
const finishes = [
  ['#b4c6c9', '#788d95', '#546b72'],
  ['#d1ed83', '#88a448', '#637633'],
  ['#91cebc', '#538f83', '#3a6961'],
];

function hit(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function initialize(canvas, get) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let viewWidth = 0;
  let viewHeight = 0;
  let animation = 0;
  let current = get().active;
  let tilt = 0;
  let targetTilt = 0;
  let lastTime = 0;
  let wheelDistance = 0;
  let lastWheel = 0;
  let wheelLock = 0;
  let hover = null;
  let carry = null;
  let ignoreClick = false;
  let hits = [];

  function paint(time) {
    animation = 0;
    const { active, groups, selected } = get();
    if (motion.matches) {
      current = active;
      tilt = 0;
    } else {
      const blend = Math.min(1, Math.max(.045, (time - lastTime) / 140));
      current += (active - current) * blend;
      tilt += (targetTilt - tilt) * blend;
    }
    lastTime = time;
    if (!viewWidth || !viewHeight) return;

    const scale = Math.min(viewWidth / 23.8, viewHeight / 10.8);
    const yaw = .32 + tilt * .074 - (current - 1) * .064;
    const pitch = .62 + tilt * .022;
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    const depth = (x, z) => x * sine + z * cosine;
    const cx = viewWidth * .51 - (current - 1) * scale * .17;
    const cy = viewHeight * .53;
    const project = (x, y, z) => ({
      x: cx + (x * cosine - z * sine) * scale,
      y: cy + (depth(x, z) * Math.sin(pitch) - y * Math.cos(pitch)) * scale,
    });

    ctx.clearRect(0, 0, viewWidth, viewHeight);
    hits = [];

    function path(points, fill, stroke, weight = 1) {
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      if (fill || points.length > 2) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    }

    function line(from, to, color, weight) {
      path([project(...from), project(...to)], null, color, weight);
    }

    function plate(x, y, z, w, d, fill, stroke) {
      const points = [
        project(x - w / 2, y, z - d / 2), project(x + w / 2, y, z - d / 2),
        project(x + w / 2, y, z + d / 2), project(x - w / 2, y, z + d / 2),
      ];
      path(points, fill, stroke);
      return points;
    }

    function box(x, y, z, width, height, length, colors, edge) {
      const a = x - width / 2;
      const b = x + width / 2;
      const f = z + length / 2;
      const n = z - length / 2;
      const t = y + height;
      const A = project(a, t, n);
      const B = project(b, t, n);
      const C = project(b, t, f);
      const D = project(a, t, f);
      const front = [D, C, project(b, y, f), project(a, y, f)];
      const side = [B, C, project(b, y, f), project(b, y, n)];
      const top = [A, B, C, D];
      path(side, colors[2], edge);
      path(front, colors[1], edge);
      path(top, colors[0], edge);
      return [top, front, side];
    }

    // Floor grid and the inlaid transfer rails run beneath all three platforms.
    for (let x = -20; x <= 20; x++) line([x, -.34, -11], [x, -.34, 11], x % 5 === 0 ? '#3e4c433e' : '#35423829');
    for (let z = -10; z <= 10; z++) line([-20, -.34, z], [20, -.34, z], z % 5 === 0 ? '#3e4c433e' : '#35423829');
    plate(.1, -.31, .28, 20.3, 1.47, '#171c18', '#344238');
    for (const z of [-.28, .83]) line([-10, -.27, z], [10, -.27, z], '#586956', 1.4);
    for (let x = -9.75; x < 10; x += .53) line([x, -.275, -.25], [x + .03, -.275, .8], '#465543', Math.max(.6, scale * .041));
    const railX = positions[active];
    line([railX - 2.92, -.25, .82], [railX + 2.92, -.25, .82], stations[active].color, 1.5);

    positions.forEach((x, station) => {
      const z = -.14 + (station - 1) * .24;
      const focused = station === active || station === carry?.target;
      const color = stations[station].color;
      const blend = Math.max(0, 1 - Math.abs(current - station));
      const deck = .39 + blend * .3;
      plate(x + .08, -.33, z + .42, 5.67, 4.86, '#060a0780', '#37463855');
      for (const fx of [x - 2.2, x + 2.2]) {
        for (const fz of [z - 1.64, z + 1.64]) {
          box(fx, -.29, fz, .45, deck + .28, .43, ['#414942', '#2d3930', '#242d27'], '#151d17');
        }
      }
      const platform = box(x, deck - .16, z, 5.07, .32, 4.31,
        ['#333e36', '#202b22', '#18211a'], focused ? '#78935a' : '#455248');
      hits.push({ station, faces: platform });
      plate(x, deck + .18, z, 4.77, 4.01, focused ? '#313c2c' : '#2c3730', focused ? '#657954' : '#46534a');

      for (const edge of [-1, 1]) {
        line([x - 2.2, deck + .19, z + edge * 1.88], [x + 2.2, deck + .19, z + edge * 1.88], focused ? color : '#66796a', 1);
        for (let tick = 0; tick < 9; tick++) {
          const px = x - 2.08 + tick * .51;
          line([px, deck + .19, z + edge * 1.89], [px + .095, deck + .19, z + edge * 2.02], focused ? '#a6be70' : '#596b5c', 1);
        }
      }
      if (focused) {
        line([x - 2.46, deck + .03, z + 2.17], [x + 2.46, deck + .03, z + 2.17], color, 1.5);
      }

      const stored = groups[station].slice(0, pallets.length);
      const locations = stored.map((task, i) => ({ ...pallets[i], task }))
        .sort((a, b) => depth(a.x, a.z) - depth(b.x, b.z));
      for (const slot of locations) {
        const px = x + slot.x;
        const pz = z + slot.z;
        const emphasized = slot.task.id === selected || slot.task.id === hover;
        const lift = emphasized && !motion.matches ? .13 : 0;
        const tall = slot.task.priority === 'high' ? .99 : slot.task.priority === 'low' ? .54 : .76;
        const base = deck + .18;
        plate(px + .05, base + .01, pz + .09, 1.64, 1.16, '#0d150f84');
        box(px, base + lift, pz, 1.52, .095, 1.07, ['#52604f', '#3e4b3d', '#303b30'], '#212c22');
        const crate = box(px, base + lift + .09, pz, 1.39, tall, .97,
          finishes[station], emphasized ? '#f7ffd7' : '#354739');
        hits.push({ station, task: slot.task, faces: crate });
        const top = base + lift + .09 + tall;
        for (const stripe of [-.37, .37]) {
          line([px + stripe, top + .012, pz - .46], [px + stripe, top + .012, pz + .46],
            station === 1 ? '#768b4e' : '#54766c', 1);
          line([px + stripe, top, pz + .49], [px + stripe, base + lift + .14, pz + .49],
            station === 1 ? '#526b37' : '#456257', 1);
        }
        const mark = project(px + .02, base + lift + .26, pz + .492);
        ctx.fillStyle = slot.task.priority === 'high' ? '#edb584' : '#e8f1e1';
        ctx.fillRect(mark.x - scale * .155, mark.y - 1, scale * .31, Math.max(1.3, scale * .06));
      }

      if (groups[station].length > pallets.length) {
        const marker = project(x + 1.9, deck + .16, z + 1.66);
        ctx.fillStyle = '#eff5de';
        ctx.font = `600 ${Math.max(9, scale * .37)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('+' + (groups[station].length - pallets.length), marker.x, marker.y);
      }
    });

    if (carry?.dragging) {
      // Project the floating crate on a plane above the scene, under the pointer.
      const y = 1.5;
      const screenX = (carry.x - cx) / scale;
      const screenZ = ((carry.y - cy) / scale + y * Math.cos(pitch)) / Math.sin(pitch);
      const worldX = screenX * cosine + screenZ * sine;
      const worldZ = screenZ * cosine - screenX * sine;
      ctx.globalAlpha = .86;
      box(worldX, y - .3, worldZ, 1.39, .68, .97, finishes[carry.item.station], '#f7ffd7');
      ctx.globalAlpha = 1;
    }

    if (!motion.matches && (Math.abs(current - active) > .002 || Math.abs(tilt - targetTilt) > .002)) request();
  }

  function request() {
    if (!animation) animation = requestAnimationFrame(paint);
  }

  function resize() {
    viewWidth = canvas.clientWidth;
    viewHeight = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewWidth * ratio);
    canvas.height = Math.round(viewHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    request();
  }

  function localPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function target(point) {
    return hits.findLast(item => item.faces.some(face => hit(face, point.x, point.y)));
  }

  function down(event) {
    if (!event.isPrimary || event.button !== 0) return;
    ignoreClick = false;
    const point = localPoint(event);
    const item = target(point);
    if (!item?.task) return;
    carry = { item, pointerId: event.pointerId, start: point, dragging: false };
  }

  function pointer(event) {
    const point = localPoint(event);
    const item = target(point);
    if (carry?.pointerId === event.pointerId) {
      if (!carry.dragging && Math.hypot(point.x - carry.start.x, point.y - carry.start.y) > 7) {
        carry.dragging = true;
        canvas.setPointerCapture(event.pointerId);
      }
      if (carry.dragging) {
        carry.x = point.x;
        carry.y = point.y;
        carry.target = item?.station;
        canvas.style.cursor = 'grabbing';
        request();
        return;
      }
    }
    targetTilt = (point.x / canvas.clientWidth - .5) * 1.65;
    hover = item?.task?.id ?? null;
    canvas.style.cursor = item ? 'pointer' : 'default';
    request();
  }

  function release(event) {
    if (carry?.pointerId !== event.pointerId) return;
    const item = target(localPoint(event));
    const { dragging, item: origin } = carry;
    carry = null;
    if (dragging) {
      ignoreClick = true;
      if (event.type === 'pointerup' && item && item.station !== origin.station) {
        void get().onMove(String(origin.task.id), item.station);
      }
    }
    canvas.style.cursor = item ? 'pointer' : 'default';
    request();
  }

  function leave() {
    if (carry && !carry.dragging) carry = null;
    targetTilt = 0;
    hover = null;
    canvas.style.cursor = carry ? 'grabbing' : 'default';
    request();
  }

  function click(event) {
    if (ignoreClick) { ignoreClick = false; return; }
    const item = target(localPoint(event));
    if (item) get().onNavigate(item.station, item.task?.id);
  }

  function wheel(event) {
    if (carry?.dragging || event.ctrlKey || event.metaKey || !event.cancelable) return;
    const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!distance) return;
    const now = performance.now();
    const direction = Math.sign(distance);
    const { active, onNavigate } = get();
    if ((direction < 0 && active === 0) || (direction > 0 && active === stations.length - 1)) return;
    event.preventDefault();
    if (now < wheelLock) return;
    if (now - lastWheel > 140 || Math.sign(wheelDistance) !== direction) wheelDistance = 0;
    lastWheel = now;
    wheelDistance += distance * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
    if (Math.abs(wheelDistance) >= 46) {
      wheelDistance = 0;
      wheelLock = now + 385;
      onNavigate(active + direction);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('click', click);
  canvas.addEventListener('wheel', wheel, { passive: false });
  motion.addEventListener('change', request);
  resize();

  return {
    request,
    dispose() {
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', pointer);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('click', click);
      canvas.removeEventListener('wheel', wheel);
      motion.removeEventListener('change', request);
    },
  };
}

export default function FieldCanvas(props) {
  const canvas = useRef(null);
  const renderer = useRef(null);
  const state = useRef(props);
  useEffect(() => {
    renderer.current = initialize(canvas.current, () => state.current);
    return () => renderer.current?.dispose?.();
  }, []);
  useEffect(() => {
    state.current = props;
    renderer.current?.request?.();
  }, [props]);
  return <canvas className="field-canvas" ref={canvas} aria-hidden="true" />;
}
