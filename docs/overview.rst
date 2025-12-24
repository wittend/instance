Overview
========

``instance`` is a minimal flow-graph editor and runtime scaffold built on Deno. It presents a palette of reusable objects which you can drag onto a canvas and connect with directed links. The visual graph can be saved as a JSON project and reloaded later.

Goals
-----
- GNU Radio Companion–style interaction model
- Simple server using ``Deno.serve`` for static files and JSON APIs
- Pluggable storage for projects (filesystem, memory, Deno KV)
- Lightweight, framework-free browser UI written in plain JavaScript

Key Concepts
------------
- Palette: Declared in ``palette_objects.json``. Each palette entry references a per-object definition file under ``./obj`` providing connector metadata and optional code snippets.
- Nodes: Instances on the canvas referencing a palette object's ``guid``. Nodes render with a header and labeled connector handles.
- Connectors: Two kinds — ``source`` (right side) and ``sink`` (left side). Links must connect source → sink.
- Edges: Directed connections rendered as SVG Bezier curves with arrowheads.
- Projects: Saved as JSON files named ``<id>_prj.json`` containing nodes, positions, and edges.

Server and Frontend
-------------------
- Server (TypeScript): ``main.ts`` serves ``/public`` and provides JSON APIs under ``/api``.
- Frontend (JavaScript): ``public/`` contains a small SPA with modules for menu/toolbar/statusbar/palette/canvas.

Storage Adapters
----------------
- Filesystem (local dev)
- Memory (default for tests and fallback on Deno Deploy)
- Deno KV (recommended for Deploy persistence)

See also: :doc:`schema` for the project JSON shape, and :doc:`storage` for adapter configuration.
