// SPDX-License-Identifier: GPL-3.0-or-later

import { showModal } from "./modal.js";

export function initMenu(container) {
  container.innerHTML = `
    <nav class="menu" role="menubar" aria-label="Application menu">
      <span class="menu-title">instance</span>
      <div class="menu-groups">
        ${menuItem("File", fileMenu())}
        ${menuItem("Edit", editMenu())}
        ${menuItem("Tools", toolsMenu())}
        ${menuItem("Help", helpMenu())}
      </div>
    </nav>
  `;
  wireDropdowns(container);
}

function menuItem(label, dropdownHtml) {
  return `
    <div class="menu-item" aria-expanded="false">
      <button type="button">${label}</button>
      <div class="menu-dropdown" role="menu">
        ${dropdownHtml}
      </div>
    </div>
  `;
}

function item(label, action, { disabled = false } = {}) {
  const dis = disabled ? 'aria-disabled="true" data-disabled="1"' : "";
  return `<div class="item" role="menuitem" data-action="${action}" ${dis}>${label}</div>`;
}
function sep() {
  return '<div class="sep" aria-hidden="true"></div>';
}

function fileMenu() {
  return [
    item("New", "app:new"),
    item("Open…", "app:open"),
    sep(),
    item("Save", "app:save"),
    item("Save As…", "app:save-as"),
  ].join("");
}
function editMenu() {
  return [
    item("Undo", "app:undo", { disabled: true }),
    item("Redo", "app:redo", { disabled: true }),
  ].join("");
}
function toolsMenu() {
  return [
    item("Options…", "app:options", { disabled: true }),
  ].join("");
}
function helpMenu() {
  return [
    item("About", "app:about"),
  ].join("");
}

function wireDropdowns(root) {
  // Toggle open/close on click
  const items = root.querySelectorAll(".menu-item");
  items.forEach((it) => {
    const btn = it.querySelector("button");
    btn?.addEventListener("click", (e) => {
      const expanded = it.getAttribute("aria-expanded") === "true";
      closeAll(root);
      it.setAttribute("aria-expanded", expanded ? "false" : "true");
      e.stopPropagation();
    });
    it.querySelector(".menu-dropdown")?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.disabled === "1") return;
      const action = target.dataset.action;
      if (action) {
        globalThis.dispatchEvent(new CustomEvent(action));
        closeAll(root);
        if (action === "app:about") {
          showAbout();
        }
      }
    });
  });
  // click outside closes
  document.addEventListener("click", () => closeAll(root));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll(root);
  });
}

function closeAll(root) {
  root.querySelectorAll('.menu-item[aria-expanded="true"]').forEach((el) =>
    el.setAttribute("aria-expanded", "false")
  );
}

function showAbout() {
  const content = document.createElement("div");
  content.innerHTML = `
    <div style="display:grid; gap:8px;">
      <div><strong>instance</strong></div>
      <div>Lightweight flow-graph editor (Deno + plain JS)</div>
      <div>
        <a href="/docs/" target="_blank" rel="noopener" style="color: var(--wire); text-decoration: none;">Documentation</a>
      </div>
    </div>
  `;
  showModal({ title: "About", content });
}
