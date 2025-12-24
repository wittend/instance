// SPDX-License-Identifier: GPL-3.0-or-later
//
// Doxygen: Palette panel for adding nodes to the canvas via click or drag-and-drop.
export async function initPalette(container) {
  container.innerHTML = "<div>Loading palette...</div>";
  const res = await fetch("/palette_objects.json");
  if (!res.ok) {
    container.innerHTML = "<div>Failed to load palette</div>";
    return;
  }
  const palette = await res.json();
  renderPalette(container, palette);
}

function renderPalette(container, palette) {
  if (!Array.isArray(palette)) {
    container.innerHTML = "<div>No palette items</div>";
    return;
  }
  const sorted = [...palette].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  container.innerHTML = "";
  for (const item of sorted) {
    const el = document.createElement("div");
    el.className = "palette-item";
    const img = document.createElement("img");
    if (item.icon) {
      img.src = item.icon;
      img.alt = item.name || item.guid || "item";
      el.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = item.name || item.guid;
    el.appendChild(label);

    // Drag start for DnD onto canvas
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData(
        "application/json",
        JSON.stringify({ type: "palette-item", guid: item.guid }),
      );
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.dropEffect = "copy";
      }
    });

    // Click-to-add convenience: spawns node at canvas center
    el.addEventListener("click", () => {
      globalThis.dispatchEvent(new CustomEvent("app:add-node", { detail: { guid: item.guid } }));
    });

    container.appendChild(el);
  }
}
