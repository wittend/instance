Project JSON Schema
===================

The project file represents the canvas state and is stored as JSON named ``<id>_prj.json``.

Top-level object
----------------
::

  {
    "id": "string",           // filename stem (no suffix)
    "name": "string?",        // optional display name
    "version": 1,              // schema version (number)
    "nodes": [ Node, ... ],
    "edges": [ Edge, ... ],
    "meta": { ... }?           // optional free-form metadata
  }

Node
----
::

  {
    "id": "string",          // unique within project
    "guid": "string",        // references a palette/object definition
    "name": "string?",       // optional display name
    "x": 100,                 // canvas center position X
    "y": 100,                 // canvas center position Y
    "connectors": [           // optional explicit connectors
      { "id": "string", "kind": "source"|"sink", "name": "string" },
      ...
    ]
  }

Edge
----
::

  {
    "id": "string",          // unique within project
    "from": { "nodeId": "string", "connectorId": "string" }, // must be a source connector
    "to":   { "nodeId": "string", "connectorId": "string" }  // must be a sink connector
  }

Validation
----------
Server-side validation is implemented in ``lib/graph.ts`` and applied on load/save:
- Required fields, types and array shapes are checked
- Duplicate ``node.id`` and ``edge.id`` are rejected
- Connectors must exist and have the correct ``kind`` for each edge endpoint
- ``version`` is a number (currently ``1``)

Responses on invalid payloads return HTTP 422 with a body like:

::

  { "error": "invalid project", "details": ["...specific messages..."] }

Examples
--------
A minimal valid project:

::

  {
    "id": "example",
    "version": 1,
    "nodes": [],
    "edges": []
  }
