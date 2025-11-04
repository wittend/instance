// SPDX-License-Identifier: GPL-3.0-or-later

export interface Storage {
  list(): Promise<string[]>; // returns list of filenames like `${id}_prj.json`
  get(id: string): Promise<unknown | null>; // id without suffix
  save(id: string, data: unknown): Promise<void>;
  remove(id: string): Promise<void>;
  rename(oldId: string, newId: string): Promise<void>;
}

export type StorageKind = "fs" | "memory" | "kv";
