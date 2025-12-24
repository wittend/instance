Storage Modes
=============

``instance`` supports multiple storage backends for project files behind a common interface.

Adapters
--------
- Filesystem (``fs``): Saves JSON files under ``./projects`` (local development)
- Memory (``memory``): In-memory map; non-persistent across restarts; used in tests and as fallback
- Deno KV (``kv``): Persistent key-value store on Deno Deploy

Configuration
-------------
Set the ``STORAGE`` environment variable to control the adapter:

::

  STORAGE=fs     deno task dev
  STORAGE=memory deno task test
  STORAGE=kv     deno run --allow-net --allow-env main.ts

The server chooses the first available in the order: requested adapter → KV → FS → Memory.

Files and Keys
--------------
- Filesystem root: ``./projects``; filenames are ``<id>_prj.json``
- KV keys: ``["projects", <id>]`` with value as the project JSON object

API Surface
-----------
Defined by ``lib/storage/types.ts``:

::

  interface Storage {
    list(): Promise<string[]>;       // returns ["<id>_prj.json", ...]
    get(id: string): Promise<unknown | null>;
    save(id: string, data: unknown): Promise<void>;
    remove(id: string): Promise<void>;
  }

Routes using storage
--------------------
- ``GET /api/projects`` → list
- ``GET /api/projects/:id`` → load (``:id`` accepts ``<id>_prj.json`` or just ``<id>``)
- ``POST /api/projects/:id`` → save
- ``DELETE /api/projects/:id`` → delete

Validation
----------
All load/save operations validate the project shape using ``lib/graph.ts``. Invalid payloads respond with HTTP 422 and error details.
