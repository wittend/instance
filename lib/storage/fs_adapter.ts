// SPDX-License-Identifier: GPL-3.0-or-later

import type { Storage } from "./types.ts";

export function createFsStorage(root = "./projects"): Storage {
  async function ensureDir() {
    await Deno.mkdir(root, { recursive: true });
  }
  async function exists(path: string): Promise<boolean> {
    try { await Deno.stat(path); return true; } catch { return false; }
  }
  return {
    async list(): Promise<string[]> {
      try {
        await ensureDir();
        const out: string[] = [];
        for await (const entry of Deno.readDir(root)) {
          if (entry.isFile && entry.name.endsWith("_prj.json")) out.push(entry.name);
        }
        return out;
      } catch (_e) {
        return [];
      }
    },
    async get(id: string): Promise<unknown | null> {
      try {
        await ensureDir();
        const text = await Deno.readTextFile(`${root}/${id}_prj.json`);
        return JSON.parse(text);
      } catch (_e) {
        return null;
      }
    },
    async save(id: string, data: unknown): Promise<void> {
      await ensureDir();
      await Deno.writeTextFile(`${root}/${id}_prj.json`, JSON.stringify(data, null, 2));
    },
    async remove(id: string): Promise<void> {
      try {
        await Deno.remove(`${root}/${id}_prj.json`);
      } catch (_e) {
        // ignore if not found
      }
    },
    async rename(oldId: string, newId: string): Promise<void> {
      await ensureDir();
      const oldPath = `${root}/${oldId}_prj.json`;
      const newPath = `${root}/${newId}_prj.json`;
      if (!(await exists(oldPath))) throw new Error("not_found");
      if (await exists(newPath)) throw new Error("conflict");
      try {
        await Deno.rename(oldPath, newPath);
      } catch (_e) {
        // Fallback copy+delete if rename fails across devices
        const data = await Deno.readTextFile(oldPath);
        await Deno.writeTextFile(newPath, data);
        await Deno.remove(oldPath);
      }
    },
  };
}
