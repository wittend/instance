// SPDX-License-Identifier: GPL-3.0-or-later

import { initMenu } from "./ui/menu.js";
import { initToolbar } from "./ui/toolbar.js";
import { initStatusbar, setDirty, setStatus } from "./ui/statusbar.js";
import { initPalette } from "./ui/palette.js";
import { initCanvas } from "./ui/canvas.js";
import {
  getState,
  loadProject,
  markSaved,
  newProject,
  serializeProject,
  setProjectId,
  subscribe,
} from "./ui/store.js";
import { toast } from "./ui/toast.js";
import { showModal } from "./ui/modal.js";

function preferSystemDark() {
  return globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
}
function getTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return preferSystemDark() ? "dark" : "light";
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  globalThis.dispatchEvent(new CustomEvent("app:theme-changed", { detail: { theme } }));
}

async function main() {
  // Theme management
  applyTheme(getTheme());
  globalThis.addEventListener("app:toggle-theme", () => {
    const next = (getTheme() === "dark") ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });

  initMenu(document.getElementById("menubar"));
  initToolbar(document.getElementById("toolbar"));
  initStatusbar(document.getElementById("statusbar"));
  initCanvas(document.getElementById("canvas"), document.getElementById("wires"));
  setStatus("Ready");

  subscribe((state) => {
    setDirty(state.dirty);
  });

  globalThis.addEventListener("app:new", () => {
    if (getState().dirty && !confirm("Discard unsaved changes?")) return;
    newProject();
    setStatus("New project");
  });

  globalThis.addEventListener("app:open", async () => {
    if (getState().dirty && !confirm("Discard unsaved changes?")) return;
    await openProjectFlow();
  });

  globalThis.addEventListener("app:save-as", async () => {
    const id = prompt("Enter project id (no extension):", getState().id || "untitled");
    if (!id) return;
    setProjectId(id);
    await saveCurrent();
  });

  globalThis.addEventListener("app:save", async () => {
    if (!getState().id) {
      const id = prompt("Enter project id (no extension):", "untitled");
      if (!id) return;
      setProjectId(id);
    }
    await saveCurrent();
  });

  globalThis.addEventListener("beforeunload", (e) => {
    if (getState().dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  try {
    await initPalette(document.getElementById("palette"));
  } catch (e) {
    console.error("Failed to load palette", e);
    setStatus("Failed to load palette");
  }
}

async function saveCurrent() {
  const state = getState();
  if (!state.id) {
    toast("No project id");
    return;
  }
  const body = serializeProject();
  const res = await fetch(`/api/projects/${state.id}_prj.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    markSaved();
    setStatus(`Saved ${state.id}`);
    toast("Saved", "success");
  } else {
    const err = await res.json().catch(() => ({ error: "save failed" }));
    toast(`Save error: ${err.error || res.status}`, "error");
  }
}

async function openProjectFlow() {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) {
      toast("Failed to list projects", "error");
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data.projects) ? data.projects : [];
    await showOpenModal(list);
  } catch (e) {
    console.error("Open flow error", e);
    toast("Open error", "error");
  }
}

function showOpenModal(fileList) {
  // fileList: array of filenames like `${id}_prj.json`
  let list = [...fileList];
  const container = document.createElement("div");
  const listEl = document.createElement("div");
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refresh";
  refreshBtn.className = "button";
  refreshBtn.style.marginBottom = "8px";
  refreshBtn.addEventListener("click", async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      list = Array.isArray(data.projects) ? data.projects : [];
      renderList();
    }
  });
  container.appendChild(refreshBtn);
  container.appendChild(listEl);

  function renderList() {
    listEl.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("div");
      empty.textContent = "No projects found.";
      listEl.appendChild(empty);
      return;
    }
    for (const fname of list) {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: "8px",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid var(--border)",
        color: "var(--color-text)",
      });
      const name = document.createElement("div");
      name.textContent = fname;
      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.className = "button";
      const renameBtn = document.createElement("button");
      renameBtn.textContent = "Rename";
      renameBtn.className = "button";
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "button";
      delBtn.style.background = "var(--button-bg)";
      delBtn.style.borderColor = "var(--button-border)";
      delBtn.style.color = "var(--color-text)";
      row.appendChild(name);
      row.appendChild(openBtn);
      row.appendChild(renameBtn);
      row.appendChild(delBtn);

      openBtn.addEventListener("click", async () => {
        if (getState().dirty && !confirm("Discard unsaved changes?")) return;
        const id = fname.replace(/_prj\.json$/, "");
        const getRes = await fetch(`/api/projects/${id}_prj.json`);
        if (!getRes.ok) {
          toast("Failed to load project", "error");
          return;
        }
        const project = await getRes.json();
        loadProject(project);
        setStatus(`Loaded ${project.id}`);
        toast("Project loaded", "success");
        dlg.close();
      });

      renameBtn.addEventListener("click", async () => {
        const oldId = fname.replace(/_prj\.json$/, "");
        const newId = prompt("Enter new project id (no extension):", oldId);
        if (!newId || newId === oldId) return;
        const res = await fetch(`/api/projects/${oldId}_prj.json`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newId }),
        });
        if (res.ok) toast("Renamed", "success");
        else {
          const err = await res.json().catch(() => ({ error: "rename failed" }));
          toast(`Rename error: ${err.error || res.status}`, "error");
        }
        // refresh list
        const listRes = await fetch("/api/projects");
        if (listRes.ok) {
          const data = await listRes.json();
          list = Array.isArray(data.projects) ? data.projects : [];
          renderList();
        }
      });

      delBtn.addEventListener("click", async () => {
        if (!confirm(`Delete ${fname}?`)) return;
        const id = fname.replace(/_prj\.json$/, "");
        const res = await fetch(`/api/projects/${id}_prj.json`, { method: "DELETE" });
        if (res.ok) {
          toast("Deleted", "success");
          list = list.filter((f) => f !== fname);
          renderList();
        } else {
          const err = await res.json().catch(() => ({ error: "delete failed" }));
          toast(`Delete error: ${err.error || res.status}`, "error");
        }
      });

      listEl.appendChild(row);
    }
  }

  renderList();
  const dlg = showModal({ title: "Open Project", content: container, actions: [] });
}

main();
