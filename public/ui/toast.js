// SPDX-License-Identifier: GPL-3.0-or-later
//
let container;
function ensureContainer() {
  if (container) return container;
  container = document.createElement("div");
  container.id = "toast-container";
  Object.assign(container.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    pointerEvents: "none",
  });
  document.body.appendChild(container);
  return container;
}

export function toast(message, type = "info", timeout = 2500) {
  const c = ensureContainer();
  const el = document.createElement("div");
  el.textContent = message;
  const color = type === "error" ? "#b42318" : type === "success" ? "#067647" : "#2f3b52";
  const bg = type === "error" ? "#fee4e2" : type === "success" ? "#ecfdf3" : "#eef2ff";
  Object.assign(el.style, {
    background: bg,
    color,
    border: `1px solid ${color}22`,
    padding: "8px 12px",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontSize: "13px",
    pointerEvents: "auto",
  });
  c.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 200ms ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 220);
  }, timeout);
}
