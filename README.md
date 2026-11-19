# Keystone

Keystone is a personal task management website with a Three.js Flow Wave and interactive wordmark on the entry page, an interactive 3D task board, a task ledger, and a weekly deadline planner. A React client talks to an Express API backed by SQLite. Signed-in users get private tasks and real-time updates across their open sessions. The demo keeps its sample tasks and changes in the current browser.

## Run on your Mac

Install Node.js 22.13 or newer. Unzip the archive, open Terminal in the `taskflow` folder, and run:

```bash
npm run setup
npm run dev
```

Open [localhost:5173](http://localhost:5173). The dev launcher generates a local signing secret in `server/.env` on first start. Vite sends API and Socket.IO requests to the Express server on port 5001.

## First session

1. Select **Sign up** or **Sign in**.
2. From the animated welcome page, select **Open dashboard**.
3. Create a task with a title, priority, status, and optional description or deadline.
4. Use the dashboard shortcuts or **Menu** to open the board, task ledger, and planner.
5. On workspace pages, press `N` to create a task or `/` to search the ledger. Use the board’s task inspector to move tasks with a keyboard or on a touch screen.

New accounts start empty. Example tasks are provided in the browser-only demo. Existing saved tasks are preserved.

## Standalone deployment

Build with `npm run setup && npm run build` and start with `npm start`. Express serves the website and API on the same origin. Set these environment variables on the host before starting:

| Variable | Value |
| --- | --- |
| `JWT_SECRET` | Stable random secret of at least 32 characters. Generate it with `openssl rand -hex 32`. |
| `HOST` | `0.0.0.0` on a hosted web service. |
| `PORT` | The host-provided port. Defaults to 5000 for standalone use. |
| `TASKFLOW_DB` | Absolute SQLite file path on a writable persistent disk. The parent directory must exist. |

Use a single instance with HTTPS and persistent storage. Use `/api/health` for the health check. For a standalone deployment, register and sign in with an email and password. This release supports individual workspaces. Shared team workspaces and email-based password recovery would require additional features.

## Tests and hosting adapter

`npm test` exercises registration, login, task validation, CRUD, account isolation, private real-time updates, and the Worker API against a SQLite-backed D1 test adapter.

`npm run build:worker` produces the existing platform adapter in `dist`. It requires the hosting platform’s trusted identity integration and a D1 `DB` binding initialized with `drizzle/0000_taskflow.sql`. Use the standalone Express build for email and password registration.

The homepage wordmark and dashboard shortcuts adapt the supplied React Bits TechText and GlassIcons samples. The slide-out workspace menu adapts the supplied StaggeredMenu interaction using a native dialog. The Flow Wave uses the supplied particle shaders and the Keystone palette.

## Vercel with a new database

Import this repository into Vercel with the repository root as the project root. The checked-in Vercel configuration installs and builds the frontend and wires the API. Use Node.js 24.

Connect a fresh Neon database via the Vercel Marketplace. Set `DATABASE_URL` to the Neon connection string and set `JWT_SECRET` to a random secret of at least 32 characters in the Vercel project's environment settings. Run [scripts/neon-schema.sql](scripts/neon-schema.sql) in the Neon SQL editor for the database configured above, then deploy or redeploy the project. Preview deployments require their own configured environment and should use a separate database branch if enabled.

Verify `/api/health` returns `{"status":"ok"}`, then register a new account, save a task, and reload the workspace. Accounts and tasks start empty on this deployment. Vercel synchronizes task state through the client's existing polling and visibility refresh.
