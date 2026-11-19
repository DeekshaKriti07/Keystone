# Keystone security audit

Reviewed the current React client, standalone Express server, hosted Worker, and both active npm lockfiles. The checks covered the seven application routes, account lifecycle, owner-scoped task mutations, private Socket.IO updates, and generated deployment assets.

| Finding | Change |
| --- | --- |
| New accounts received example tasks that inflated dashboard totals. | Local and hosted accounts now start empty. Browser demo data is explicitly labeled. Existing account records were preserved because saved examples may have been edited into real tasks. |
| npm flagged Vite and esbuild development-server advisories. | Upgraded Vite, its React plugin, and esbuild. Vite now binds to loopback by default. [Vite advisory](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) · [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| The unused nodemon dependency brought in an affected minimatch version. | Replaced the server watch command with Node's built-in watcher and removed nodemon. [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| The Worker read write-request bodies before applying a size limit, and account deletion had no explicit body limit. | Both hosted handlers now reject JSON bodies over 16 KiB while reading them. |
| Document responses lacked a Content Security Policy. | Added shared CSP, referrer and permissions policies, and MIME-sniffing protection. Standalone Express also rejects framing. New development secrets are created with owner-only file permissions. |

## Verification

- Both active npm audits returned zero known vulnerabilities after the changes.
- The Worker build passed. All seven routes returned the app shell with security headers, and the favicon loaded.
- Integration tests passed for authentication, empty new workspaces, task validation, owner isolation, private Socket.IO events, and account deletion. Deletion tests covered missing authentication, incorrect confirmation, oversized bodies, and preservation of another owner's task.

## Remaining boundaries

The standalone client stores a JWT in local storage. Content Security Policy reduces exposure to injected scripts, and an HttpOnly session redesign would further reduce token exposure. The hosted Worker relies on the Sites gateway to supply trusted identity headers. Deploy that adapter only behind its identity gateway. This review used source inspection, package advisories, and automated local checks. It did not include a live penetration test.
