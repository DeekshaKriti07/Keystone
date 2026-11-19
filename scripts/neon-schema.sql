CREATE TABLE IF NOT EXISTS users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  due_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_created ON tasks (user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS auth_limits (
  client_key text PRIMARY KEY,
  bucket bigint NOT NULL,
  attempts integer NOT NULL
);
