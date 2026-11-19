import { handleApi } from './api.js';
import { assets } from './assets.generated.js';
import { pageAt } from '../shared/pages.js';
import { securityHeaders } from '../shared/securityHeaders.js';

const types = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
};

function mediaResponse(asset, request, headers) {
  const { length, base64 } = asset;
  headers.set('Accept-Ranges', 'bytes');
  const range = request.method === 'GET' && request.headers.get('Range');
  let start = 0;
  let end = length - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      headers.set('Content-Range', 'bytes */' + length);
      return new Response(null, { status: 416, headers });
    }
    start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    if (start >= length || end < start) {
      headers.set('Content-Range', 'bytes */' + length);
      return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  }
  headers.set('Content-Length', String(end - start + 1));
  const body = request.method === 'HEAD' ? null :
    Uint8Array.from(atob(base64).slice(start, end + 1), value => value.charCodeAt(0));
  return new Response(body, { status: range ? 206 : 200, headers });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return handleApi(request, env, path);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const key = pageAt(path) ? '/index.html' : path;
    if (!Object.hasOwn(assets, key)) return new Response('Not found', { status: 404 });
    const headers = new Headers({
      'Content-Type': types[key.split('.').pop()] ?? 'application/octet-stream',
      'Cache-Control': key.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      ...securityHeaders,
    });
    const asset = assets[key];
    if (typeof asset === 'object') return mediaResponse(asset, request, headers);
    return new Response(request.method === 'HEAD' ? null : asset, { headers });
  },
};
