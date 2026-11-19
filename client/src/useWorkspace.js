import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { sampleTasks } from '../../shared/tasks.js';

const demoKey = 'taskflow.demo.v2';
const tokenKey = 'taskflow_token';

function readDemo() {
  try {
    const stored = JSON.parse(localStorage.getItem(demoKey));
    if (Array.isArray(stored)) return stored;
  } catch { /* Recover with a fresh board. */ }
  return sampleTasks().map((task, index) => ({ ...task, id: 'demo-' + index }));
}

async function request(path, token, method = 'GET', input) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (input !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { method, headers, body: input === undefined ? undefined : JSON.stringify(input) });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Could not complete the request.'), { status: response.status });
  return data;
}

export default function useWorkspace() {
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [demo, setDemo] = useState(readDemo);
  const [remote, setRemote] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState(false);
  const version = useRef(0);
  const signedIn = Boolean(session?.user);

  const checkSession = useCallback(async () => {
    try {
      const data = await request('/api/session', token);
      if (data.mode !== 'hosted' && !data.user && token) {
        localStorage.removeItem(tokenKey);
        setToken(null);
      }
      setSession(data);
      setError('');
    } catch {
      setSession(previous => previous || { mode: 'unavailable', user: null });
      setError('The workspace server is unavailable.');
    }
  }, [token]);

  useEffect(() => { checkSession(); }, [checkSession]);
  useEffect(() => { localStorage.setItem(demoKey, JSON.stringify(demo)); }, [demo]);

  const load = useCallback(async () => {
    const current = ++version.current;
    try {
      const { tasks } = await request('/api/tasks', token);
      if (current !== version.current) return;
      setRemote(tasks);
      setError('');
    } catch (failure) {
      if (current !== version.current) return;
      setError(failure.message);
      if (failure.status === 401) void checkSession();
    } finally {
      if (current === version.current) setLoaded(true);
    }
  }, [token, checkSession]);

  useEffect(() => {
    if (!signedIn) return;
    void load();
    const interval = setInterval(() => { if (!document.hidden) void load(); }, 6000);
    const refresh = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', refresh);
    let socket;
    if (session.mode === 'local') {
      socket = io({ auth: { token } });
      socket.on('connect', () => { setSync(true); void load(); });
      socket.on('disconnect', () => setSync(false));
      for (const name of ['task:created', 'task:updated', 'task:deleted']) socket.on(name, load);
    }
    return () => {
      version.current++;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      socket?.disconnect();
      setSync(false);
    };
  }, [signedIn, session?.mode, token, load]);

  async function authenticate(mode, payload) {
    const data = await request('/api/auth/' + mode, null, 'POST', payload);
    localStorage.setItem(tokenKey, data.token);
    setRemote([]);
    setLoaded(false);
    setToken(data.token);
    setSession({ mode: data.mode ?? 'local', user: data.user });
  }

  function signOut() {
    version.current++;
    localStorage.removeItem(tokenKey);
    setSession({ mode: 'local', user: null });
    setToken(null);
    setRemote([]);
    setLoaded(false);
  }

  async function deleteAccount(confirmation) {
    if (!signedIn) throw new Error('Sign in to manage your account.');
    await request('/api/account', token, 'DELETE', { confirmation });
    if (session.mode === 'hosted') {
      version.current++;
      setRemote([]);
      setSession({ mode: 'hosted', user: null, accountDeleted: true });
    } else {
      signOut();
    }
  }

  async function mutate(method, id, input) {
    if (!signedIn) {
      const created = method === 'POST' ? { ...input, id: crypto.randomUUID() } : null;
      setDemo(previous => {
        if (created) return [created, ...previous];
        if (method === 'DELETE') return previous.filter(task => task.id !== id);
        return previous.map(task => task.id === id ? { ...task, ...input } : task);
      });
      return created;
    }
    const path = '/api/tasks' + (id == null ? '' : '/' + encodeURIComponent(id));
    try {
      const data = await request(path, token, method, input);
      await load();
      return data?.task;
    } catch (failure) {
      if (failure.status === 401) void checkSession();
      throw failure;
    }
  }

  return { session, tasks: signedIn ? remote : demo, busy: !session || (signedIn && !loaded), error, sync, authenticate, signOut, deleteAccount, mutate, retry: signedIn ? load : checkSession };
}
