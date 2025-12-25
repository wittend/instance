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
    const wrapper = document.createElement("div");
    wrapper.className = "palette-group";
    wrapper.setAttribute("aria-expanded", "false");

    const header = document.createElement("div");
    header.className = "palette-item";

    if (item.icon) {
      const img = document.createElement("img");
      img.src = item.icon;
      img.alt = item.name || item.guid || "item";
      header.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = item.name || item.guid;
    header.appendChild(label);

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    header.appendChild(chevron);

    wrapper.appendChild(header);

    const dropdown = document.createElement("div");
    dropdown.className = "palette-dropdown";

    // The item itself is in its own dropdown
    const subItems = item.items || [item];
    for (const sub of subItems) {
      const el = document.createElement("div");
      el.className = "palette-sub-item";
      if (sub.icon || item.icon) {
        const img = document.createElement("img");
        img.src = sub.icon || item.icon;
        img.alt = sub.name || sub.guid || "item";
        el.appendChild(img);
      }
      const subLabel = document.createElement("span");
      subLabel.textContent = sub.name || sub.guid;
      el.appendChild(subLabel);

      // Drag start for DnD onto canvas
      el.draggable = true;
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer?.setData(
          "application/json",
          JSON.stringify({ type: "palette-item", guid: sub.guid }),
        );
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.dropEffect = "copy";
        }
      });

      // Click-to-add convenience
      el.addEventListener("click", (e) => {
        globalThis.dispatchEvent(
          new CustomEvent("app:add-node", { detail: { guid: sub.guid } }),
        );
        e.stopPropagation();
      });

      dropdown.appendChild(el);
    }

    wrapper.appendChild(dropdown);

    header.addEventListener("click", (e) => {
      const expanded = wrapper.getAttribute("aria-expanded") === "true";
      // Close others
      container.querySelectorAll('.palette-group[aria-expanded="true"]').forEach(
        (el) => {
          if (el !== wrapper) el.setAttribute("aria-expanded", "false");
        },
      );
      wrapper.setAttribute("aria-expanded", expanded ? "false" : "true");
      e.stopPropagation();
    });

    container.appendChild(wrapper);
  }

  // Close palette dropdowns on outside click
  document.addEventListener("click", () => {
    container.querySelectorAll('.palette-group[aria-expanded="true"]').forEach(
      (el) => el.setAttribute("aria-expanded", "false"),
    );
  });
}
