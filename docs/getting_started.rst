Getting Started
===============

Prerequisites
-------------
- Deno 2.4+ (stable)
- Optional for docs: Python 3.9+ with pip to build Sphinx documentation

Run locally
-----------
1. Install Deno: https://deno.com/runtime
2. Start the dev server:

   ::

     deno task dev

3. Open the app at http://localhost:8000

Using the app
-------------
- The left panel shows the palette.
- Drag items from the palette onto the canvas to create nodes.
- Move nodes by dragging their bodies.
- Create a connection by clicking a source handle (right side), then a sink handle (left side).
- Save or Save As using the toolbar buttons. On local dev, projects are written to ``./projects``.
- Use Open to load a previously saved project.

Testing
-------
Run the test suite:

::

  deno task test

This runs integration tests against the server and unit tests for geometry helpers.

Project layout
--------------
- ``main.ts`` — Deno.serve-based server for static content and JSON APIs
- ``public/`` — frontend SPA (no framework)
- ``obj/`` — object definition files (palette entries point here)
- ``projects/`` — saved project JSON files (local dev)
- ``lib/`` — server-side helpers (graph validation, storage adapters, geometry)

Next steps
----------
- See :doc:`schema` for the project JSON format
- See :doc:`storage` for persistence options
- See :doc:`deploy` for deploying to Deno Deploy with KV
