// SPDX-License-Identifier: GPL-3.0-or-later
import { updateNode } from "./store.js";

export function showNodeEditor(node, { x, y, canvasRect, onSave }) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: 0,
    zIndex: 10001,
  });

  const popup = document.createElement("div");
  popup.className = "popup-editor";
  Object.assign(popup.style, {
    position: "absolute",
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "300px",
  });

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Name";
  nameLabel.style.fontSize = "12px";
  nameLabel.style.fontWeight = "600";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = node.name || "";
  nameInput.className = "input";
  nameInput.style.width = "100%";

  const codeLabel = document.createElement("label");
  codeLabel.textContent = "Code (JSON process)";
  codeLabel.style.fontSize = "12px";
  codeLabel.style.fontWeight = "600";
  const codeInput = document.createElement("textarea");
  // Assuming code is stored as { process: "..." } in node.code
  codeInput.value = node.code?.process || "";
  codeInput.className = "input";
  codeInput.style.width = "100%";
  codeInput.style.height = "100px";
  codeInput.style.fontFamily = "monospace";
  codeInput.style.fontSize = "12px";

  const actions = document.createElement("div");
  Object.assign(actions.style, {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "4px",
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "button";
  cancelBtn.onclick = () => overlay.remove();

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "button";
  saveBtn.style.background = "#eef2ff";
  saveBtn.style.borderColor = "#6366f1";
  saveBtn.style.color = "#4338ca";

  saveBtn.onclick = () => {
    updateNode(node.id, {
      name: nameInput.value,
      code: { process: codeInput.value }
    });
    if (onSave) onSave();
    overlay.remove();
  };

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  popup.appendChild(nameLabel);
  popup.appendChild(nameInput);
  popup.appendChild(codeLabel);
  popup.appendChild(codeInput);
  popup.appendChild(actions);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Position logic: above the object
  // node coordinates (x, y) are center of node in canvas space
  // canvasRect is result of canvas.getBoundingClientRect()
  
  const popupRect = popup.getBoundingClientRect();
  let top = canvasRect.top + y - 32 - popupRect.height; // 32 is roughly half node height + margin
  let left = canvasRect.left + x - popupRect.width / 2;

  // Keep in viewport
  if (left < 10) left = 10;
  if (left + popupRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popupRect.width - 10;
  }
  if (top < 10) {
    // If not enough space above, show below
    top = canvasRect.top + y + 32;
  }
  if (top + popupRect.height > window.innerHeight - 10) {
    top = window.innerHeight - popupRect.height - 10;
  }

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  nameInput.focus();
}
