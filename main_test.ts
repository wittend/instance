// SPDX-License-Identifier: GPL-3.0-or-later

import { assert, assertEquals } from "@std/assert";
import { startServer } from "./main.ts";

// Force memory storage for tests regardless of runner env
Deno.env.set("STORAGE", "memory");

function getPort(server: Deno.ServeHandler) {
  // @ts-ignore - deno.serve returns a server-like with addr
  return (server.addr && server.addr.port) || 8000;
}

Deno.test("health and static index", async () => {
  const ac = new AbortController();
  const server = startServer(0, ac.signal);
  const port = getPort(server as any);
  const base = `http://localhost:${port}`;

  const res = await fetch(`${base}/api/health`);
  assert(res.ok);
  const body = await res.json();
  assertEquals(body.ok, true);

  const res2 = await fetch(`${base}/`);
  assert(res2.ok);
  const html = await res2.text();
  assert(html.includes("flow-dash"));

  ac.abort();
});

Deno.test("projects CRUD and validation", async () => {
  const ac = new AbortController();
  const server = startServer(0, ac.signal);
  const port = getPort(server as any);
  const base = `http://localhost:${port}`;

  // list initially (memory storage default in test task)
  const list0 = await fetch(`${base}/api/projects`);
  assert(list0.ok);
  const listBody0 = await list0.json();
  assert(Array.isArray(listBody0.projects));
  assertEquals(listBody0.projects.length, 0);

  // save valid project
  const validProject = {
    id: "ignored", // will be overridden by server
    version: 123,   // will be overridden if not a number; we send a number to pass schema
    nodes: [
      {
        id: "n1",
        guid: "sample-generator",
        name: "Node 1",
        x: 100,
        y: 120,
        connectors: [
          { id: "out", kind: "source", name: "out" }
        ]
      },
      {
        id: "n2",
        guid: "sample-generator",
        name: "Node 2",
        x: 300,
        y: 200,
        connectors: [
          { id: "in", kind: "sink", name: "in" }
        ]
      }
    ],
    edges: [
      {
        id: "e1",
        from: { nodeId: "n1", connectorId: "out" },
        to: { nodeId: "n2", connectorId: "in" }
      }
    ]
  };

  const saveRes = await fetch(`${base}/api/projects/test1_prj.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validProject)
  });
  assert(saveRes.ok);
  const saveBody = await saveRes.json();
  assertEquals(saveBody.ok, true);

  // list should now include the file
  const list1 = await fetch(`${base}/api/projects`);
  assert(list1.ok);
  const listBody1 = await list1.json();
  assert(Array.isArray(listBody1.projects));
  assertEquals(listBody1.projects.includes("test1_prj.json"), true);

  // get the project back
  const getRes = await fetch(`${base}/api/projects/test1_prj.json`);
  assert(getRes.ok);
  const getBody = await getRes.json();
  assertEquals(getBody.id, "test1");
  assert(typeof getBody.version, "number");
  assertEquals(getBody.nodes.length, 2);
  assertEquals(getBody.edges.length, 1);

  // invalid save (nodes is not array)
  const badProject = { nodes: "oops", edges: [] } as any;
  const badRes = await fetch(`${base}/api/projects/bad_prj.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(badProject)
  });
  assertEquals(badRes.status, 422);
  const badBody = await badRes.json();
  assertEquals(typeof badBody.error, "string");

  // request size too large
  const large = { nodes: [], edges: [], big: "x".repeat(2 * 1024 * 1024) };
  const largeRes = await fetch(`${base}/api/projects/large_prj.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(large)
  });
  assertEquals(largeRes.status, 413);
  await largeRes.text();

  // delete project
  const delRes = await fetch(`${base}/api/projects/test1_prj.json`, { method: "DELETE" });
  assert(delRes.ok);
  const delBody = await delRes.json();
  assertEquals(delBody.ok, true);

  // verify gone
  const getGone = await fetch(`${base}/api/projects/test1_prj.json`);
  assertEquals(getGone.status, 404);
  await getGone.text();

  ac.abort();
});


Deno.test("project rename endpoint", async () => {
  const ac = new AbortController();
  const server = startServer(0, ac.signal);
  const port = ((server as any).addr && (server as any).addr.port) || 8000;
  const base = `http://localhost:${port}`;

  // create two simple projects
  const minimal = { nodes: [], edges: [] };
  let res = await fetch(`${base}/api/projects/r1_prj.json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(minimal) });
  assert(res.ok);
  await res.text();
  res = await fetch(`${base}/api/projects/r2_prj.json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(minimal) });
  assert(res.ok);
  await res.text();

  // rename r1 -> r1b
  let patch = await fetch(`${base}/api/projects/r1_prj.json`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ newId: 'r1b' }) });
  assert(patch.ok);
  await patch.text();
  const getOld = await fetch(`${base}/api/projects/r1_prj.json`);
  assertEquals(getOld.status, 404);
  await getOld.text();
  const getNew = await fetch(`${base}/api/projects/r1b_prj.json`);
  assert(getNew.ok);
  const newBody = await getNew.json();
  assertEquals(newBody.id, 'r1b');

  // conflict: try to rename r1b -> r2 (exists)
  const conflict = await fetch(`${base}/api/projects/r1b_prj.json`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ newId: 'r2' }) });
  assertEquals(conflict.status, 409);
  await conflict.text();

  // cleanup
  const del1 = await fetch(`${base}/api/projects/r1b_prj.json`, { method: 'DELETE' });
  await del1.text();
  const del2 = await fetch(`${base}/api/projects/r2_prj.json`, { method: 'DELETE' });
  await del2.text();

  ac.abort();
});
