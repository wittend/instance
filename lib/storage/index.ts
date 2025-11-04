import type { Storage, StorageKind } from "./types.ts";
import { createMemoryStorage } from "./memory_adapter.ts";
import { createFsStorage } from "./fs_adapter.ts";
import { createKvStorage } from "./kv_adapter.ts";

export async function createStorageFromEnv(): Promise<Storage> {
  const wanted = (Deno.env.get("STORAGE") as StorageKind | undefined)?.toLowerCase() as StorageKind | undefined;
  // Try requested kind first, then fallbacks: kv -> fs -> memory
  const tried: string[] = [];
  async function tryKv(): Promise<Storage | null> {
    try {
      const s = await createKvStorage();
      return s;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tried.push(`kv:${msg}`);
      return null;
    }
  }
  function tryFs(): Storage | null {
    try {
      return createFsStorage();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tried.push(`fs:${msg}`);
      return null;
    }
  }
  function tryMemory(): Storage { return createMemoryStorage(); }

  const order: StorageKind[] = wanted ? [wanted, ...(["kv","fs","memory"] as StorageKind[]).filter(k => k !== wanted)] : ["kv","fs","memory"];
  for (const kind of order) {
    if (kind === "kv") {
      const s = await tryKv();
      if (s) return s;
    } else if (kind === "fs") {
      const s = tryFs();
      if (s) return s;
    } else if (kind === "memory") {
      return tryMemory();
    }
  }
  // Fallback
  return tryMemory();
}
