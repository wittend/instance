import type { Storage } from "./types.ts";

export function createMemoryStorage(): Storage {
  const map = new Map<string, unknown>();
  return {
    async list(): Promise<string[]> {
      return Array.from(map.keys()).map((k) => `${k}_prj.json`);
    },
    async get(id: string): Promise<unknown | null> {
      return map.has(id) ? map.get(id)! : null;
    },
    async save(id: string, data: unknown): Promise<void> {
      map.set(id, data);
    },
    async remove(id: string): Promise<void> {
      map.delete(id);
    },
    async rename(oldId: string, newId: string): Promise<void> {
      if (!map.has(oldId)) throw new Error("not_found");
      if (map.has(newId)) throw new Error("conflict");
      const val = map.get(oldId)!;
      map.set(newId, val);
      map.delete(oldId);
    },
  };
}
