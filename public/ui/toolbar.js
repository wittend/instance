// SPDX-License-Identifier: GPL-3.0-or-later
//
export function initToolbar(container) {
  const btn = (id, label) => `<button class="button" id="${id}">${label}</button>`;
  container.innerHTML = [
    btn("btn-new", "New"),
    btn("btn-open", "Open"),
    btn("btn-save", "Save"),
    btn("btn-save-as", "Save As"),
    btn("btn-theme", "Theme"),
  ].join("");

  container.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    switch (t.id) {
      case "btn-new":
        dispatch("app:new");
        break;
      case "btn-open":
        dispatch("app:open");
        break;
      case "btn-save":
        dispatch("app:save");
        break;
      case "btn-save-as":
        dispatch("app:save-as");
        break;
      case "btn-theme":
        dispatch("app:toggle-theme");
        break;
    }
  });
}

function dispatch(type, detail) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}
