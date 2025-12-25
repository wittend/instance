// SPDX-License-Identifier: GPL-3.0-or-later

import { assert, assertEquals } from "@std/assert";
import { startServer } from "./main.ts";

function getPort(server: Deno.ServeHandler) {
  // @ts-ignore: Deno.serve return type includes addr
  return (server.addr && server.addr.port) || 8000;
}

Deno.test("api/objects listing", async () => {
  const ac = new AbortController();
  const server = startServer(0, ac.signal);
  const port = getPort(server as unknown as Deno.ServeHandler);
  const base = `http://localhost:${port}`;

  const res = await fetch(`${base}/api/objects`);
  assert(res.ok);
  const objects = await res.json() as Array<{
    guid: string;
    name: string;
    category: string;
  }>;
  assert(Array.isArray(objects));

  // We expect at least the sample objects we updated
  const guids = objects.map((o) => o.guid);
  assert(guids.includes("sample-generator"));
  assert(guids.includes("sample-filter"));
  assert(guids.includes("sample-filter2"));
  assert(guids.includes("sample-sink"));

  // Check metadata
  const generator = objects.find((o) => o.guid === "sample-generator");
  assert(generator);
  assertEquals(generator.name, "Sample Generator");
  assertEquals(generator.category, "Generators");

  ac.abort();
});
