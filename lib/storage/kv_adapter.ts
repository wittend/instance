import type { Storage } from "./types.ts";

// Deno KV adapter. Keys are stored under ["projects", id]
export async function createKvStorage(): Promise<Storage> {
  // If KV is unavailable, this will throw
  const kv = await Deno.openKv();
  return {
    async list(): Promise<string[]> {
      const out: string[] = [];
      const iter = kv.list({ prefix: ["projects"] });
      for await (const entry of iter) {
        const id = entry.key[1] as string;
        out.push(`${id}_prj.json`);
      }
      return out;
    },
    async get(id: string): Promise<unknown | null> {
      const res = await kv.get(["projects", id]);
      return (res.value as unknown) ?? null;
    },
    async save(id: string, data: unknown): Promise<void> {
      await kv.set(["projects", id], data);
    },
    async remove(id: string): Promise<void> {
      await kv.delete(["projects", id]);
    },
    async rename(oldId: string, newId: string): Promise<void> {
      const oldKey = ["projects", oldId] as const;
      const newKey = ["projects", newId] as const;
      const old = await kv.get(oldKey);
      if (!old.value) throw new Error("not_found");
      const exists = await kv.get(newKey);
      if (exists.value) throw new Error("conflict");
      // Perform set new then delete old (best-effort atomicity not available without atomic ops on KV yet)
      await kv.set(newKey, old.value);
      await kv.delete(oldKey);
    },
  };
}
