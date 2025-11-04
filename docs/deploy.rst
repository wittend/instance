Deploying to Deno Deploy
========================

This project is designed to run on Deno Deploy. Follow the steps below to deploy and enable persistent storage with Deno KV.

Prerequisites
-------------
- Deno Deploy account linked to your GitHub repository
- The repository contains the application entrypoint ``main.ts``

Quick Start (Memory Storage)
----------------------------
If you deploy without configuring KV, the server will fall back to in-memory storage. Saves will work for the lifetime of the instance but are not persisted across restarts.

To try quickly:
- Create a new Deploy project from this repo
- Set the entrypoint to ``main.ts``
- Leave env vars unset → storage will be memory

Enable Deno KV (Persistent)
----------------------------
To persist projects, enable Deno KV and set the ``STORAGE`` environment variable to ``kv``.

Steps:
1. In your Deno Deploy project settings, go to the "KV Databases" section and enable a KV database.
2. Add an environment variable:

   ::

     STORAGE=kv

3. Redeploy. The server will detect KV availability and store projects under keys ``["projects", <id>]``.

Notes
-----
- The API is unchanged between storage backends; the UI will work the same.
- If KV initialization fails at runtime, the server gracefully falls back (KV → FS → Memory). On Deploy, FS is unavailable, so fallback is Memory.
- Consider setting up access controls for your app's endpoints before exposing it publicly.

Troubleshooting
---------------
- 404 on load after save: Ensure that ``POST /api/projects/:id`` succeeded (status 200 and ``{"ok":true}``) and that ``GET /api/projects`` lists ``<id>_prj.json``.
- 422 on save: Your project payload failed validation. See the error ``details`` array in the JSON response and compare against :doc:`schema`.
- No persistence on Deploy: Verify ``STORAGE=kv`` is set and a KV database is enabled for the project.
