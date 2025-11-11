// SPDX-License-Identifier: GPL-3.0-or-later

// flow-dash server (TS). Serves static files from /public and JSON APIs under /api.
// Option B: TypeScript server with plain JS frontend.

// Basic router helper
function matchRoute(url: URL, method: string) {
  const pathname = url.pathname;
  const segments = pathname.split("/").filter(Boolean);
  return { pathname, segments, method };
}

// Simple content type mapping
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

// Utility to serve a static file under /public
async function serveFile(path: string): Promise<Response> {
  try {
    const data = await Deno.readFile(path);
    const ext = path.substring(path.lastIndexOf("."));
    const type = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new Response(data, { headers: { "content-type": type } });
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    }
    console.error("serveFile error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// In-memory store fallback for Deploy or restricted environments
type Project = { id: string; data: unknown };
const memoryProjects = new Map<string, unknown>();
let fsAvailable: boolean | null = null;
async function ensureFsAvailable() {
  if (fsAvailable !== null) return fsAvailable;
  try {
    await Deno.mkdir("./projects", { recursive: true });
    // Probe read/write
    const probe = crypto.randomUUID();
    await Deno.writeTextFile("./projects/.probe", probe);
    const readBack = await Deno.readTextFile("./projects/.probe");
    await Deno.remove("./projects/.probe");
    fsAvailable = readBack === probe;
  } catch (_e) {
    fsAvailable = false;
  }
  return fsAvailable;
}

import { validateProject, CURRENT_SCHEMA_VERSION, GraphValidationError } from "./lib/graph.ts";
import { createStorageFromEnv } from "./lib/storage/index.ts";

// API handlers
async function handleApi(req: Request, url: URL, storagePromise: Promise<import('./lib/storage/types.ts').Storage>): Promise<Response> {
  const { pathname, segments, method } = matchRoute(url, req.method);

  if (pathname === "/api/health" && method === "GET") {
    return json({ ok: true });
  }

  if (pathname === "/api/palette" && method === "GET") {
    try {
      const text = await Deno.readTextFile("./palette_objects.json");
      return new Response(text, { headers: { "content-type": CONTENT_TYPES[".json"] } });
    } catch (e) {
      console.error("/api/palette error", e);
      return json({ error: "palette_objects.json not found" }, 404);
    }
  }
  

  if (segments[0] === "api" && segments[1] === "objects" && method === "GET") {
    const guid = segments[2];
    if (!guid) return json({ error: "Missing guid" }, 400);
    try {
      const path = `./obj/${guid}_obj.json`;
      const text = await Deno.readTextFile(path);
      return new Response(text, { headers: { "content-type": CONTENT_TYPES[".json"] } });
    } catch (e) {
      console.error("/api/objects error", e);
      return json({ error: "object definition not found" }, 404);
    }
  }

  if (segments[0] === "api" && segments[1] === "projects" && method === "GET" && segments.length === 2) {
    // list projects
    try {
      const storage = await storagePromise;
      const entries = await storage.list();
      return json({ projects: entries });
    } catch (e) {
      console.error("/api/projects list error", e);
      return json({ error: "failed to list projects" }, 500);
    }
  }

  if (segments[0] === "api" && segments[1] === "projects" && segments[2] && method === "GET") {
    const idWithSuffix = segments[2];
    const id = idWithSuffix.replace(/_prj\.json$/, "");
    try {
      const storage = await storagePromise;
      const obj = await storage.get(id);
      if (!obj) return json({ error: "not found" }, 404);
      try {
        validateProject(obj);
      } catch (err) {
        console.error("/api/projects validation error", err);
        return json({ error: "invalid project format" }, 422);
      }
      return json(obj);
    } catch (e) {
      console.error("/api/projects get error", e);
      return json({ error: "failed to load project" }, 404);
    }
  }

  if (segments[0] === "api" && segments[1] === "projects" && segments[2] && method === "POST") {
    const idWithSuffix = segments[2];
    const id = idWithSuffix.replace(/_prj\.json$/, "");
    const lenHeader = req.headers.get("content-length");
    const len = lenHeader ? Number(lenHeader) : undefined;
    const MAX = 2 * 1024 * 1024; // 2MB
    if (len && len > MAX) return json({ error: "payload too large" }, 413);
    const body = await safeJson(req);
    if (body.error) return json(body, 400);
    // enforce id and version
    if (typeof body === "object" && body) {
      body.id = id;
      if (typeof body.version !== "number") body.version = CURRENT_SCHEMA_VERSION;
    }
    try {
      validateProject(body);
    } catch (e) {
      const details = (e instanceof GraphValidationError) ? e.details : undefined;
      return json({ error: "invalid project", details }, 422);
    }
    try {
      const storage = await storagePromise;
      await storage.save(id, body);
      return json({ ok: true });
    } catch (e) {
      console.error("/api/projects save error", e);
      return json({ error: "failed to save project" }, 500);
    }
  }

  if (segments[0] === "api" && segments[1] === "projects" && segments[2] && method === "DELETE") {
    const idWithSuffix = segments[2];
    const id = idWithSuffix.replace(/_prj\.json$/, "");
    try {
      const storage = await storagePromise;
      await storage.remove(id);
      return json({ ok: true });
    } catch (e) {
      console.error("/api/projects delete error", e);
      return json({ error: "failed to delete project" }, 500);
    }
  }

  // Rename project: PATCH /api/projects/:id  body: { newId }
  if (segments[0] === "api" && segments[1] === "projects" && segments[2] && method === "PATCH") {
    const idWithSuffix = segments[2];
    const oldId = idWithSuffix.replace(/_prj\.json$/, "");
    const body = await safeJson(req);
    if (body.error) return json(body, 400);
    const newId = typeof body?.newId === "string" ? body.newId.trim() : "";
    if (!newId) return json({ error: "newId is required" }, 400);
    if (!/^[a-zA-Z0-9_-]+$/.test(newId)) return json({ error: "newId has invalid characters" }, 400);
    try {
      const storage = await storagePromise;
      const existing = await storage.get(oldId);
      if (!existing) return json({ error: "not found" }, 404);
      const conflict = await storage.get(newId);
      if (conflict) return json({ error: "conflict: target exists" }, 409);
      // perform rename in storage backend
      if (typeof storage.rename === 'function') {
        try { await storage.rename(oldId, newId); } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === 'not_found') return json({ error: "not found" }, 404);
          if (msg === 'conflict') return json({ error: "conflict: target exists" }, 409);
          throw e;
        }
      } else {
        // fallback: save new and delete old
        await storage.save(newId, existing);
        await storage.remove(oldId);
      }
      // ensure content has updated id
      if (existing && typeof existing === 'object') {
        (existing as any).id = newId;
        await (await storagePromise).save(newId, existing);
      }
      return json({ ok: true });
    } catch (e) {
      console.error("/api/projects rename error", e);
      return json({ error: "failed to rename project" }, 500);
    }
  }

  return new Response("Not Found", { status: 404 });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": CONTENT_TYPES[".json"] },
  });
}

async function safeJson(req: Request): Promise<any> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return { error: "invalid JSON" };
  }
}

// Static file resolution
async function handleStatic(url: URL): Promise<Response> {
  let path = url.pathname;
  if (path === "/") path = "/index.html";
  // prevent path traversal
  if (path.includes("..")) return new Response("Bad Request", { status: 400 });
  return await serveFile(`./public${path}`);
}

export function startServer(port: number, signal?: AbortSignal) {
  console.log(`flow-dash server listening on http://localhost:${port}`);
  // Initialize storage per-server to respect current env (useful in tests)
  const storagePromise = createStorageFromEnv();
  const server = Deno.serve({ port, signal }, async (req) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, url, storagePromise);
    }
    return await handleStatic(url);
  });
  return server;
}

if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 8000);
  startServer(port);
}
