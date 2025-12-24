// SPDX-License-Identifier: GPL-3.0-or-later
//
// Doxygen: Canvas renderer and interactions for the flow-graph editor.
// - Renders nodes and wires on an HTML5 canvas and companion SVG for arrowheads.
// - Handles drag, drop from palette, and link creation between connectors.
//
import {
  addNode,
  cancelLink,
  finishLink,
  getState,
  moveNode,
  startLink,
  subscribe,
  updateLinkPreview,
} from "./store.js";

// Helper for UUID generation in non-secure contexts
function getUUID() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback to simpler random if not available
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function initCanvas(canvasEl, svgEl) {
  const ctx = canvasEl.getContext("2d");

  // SVG defs for arrowhead (theme-aware)
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function buildDefs() {
    const wire = cssVar("--wire") || "#4b89ff";
    svgEl.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${wire}"></path>
        </marker>
      </defs>
    `;
  }
  buildDefs();
  window.addEventListener("app:theme-changed", () => {
    buildDefs();
    render();
  });

  const NODE_W = 160, NODE_H = 64, RADIUS = 8;

  let dragging = null; // { nodeId, offsetX, offsetY }

  resize();
  window.addEventListener("resize", resize);
  subscribe(() => render());

  // Support click-to-add from palette
  window.addEventListener("app:add-node", async (ev) => {
    try {
      const guid = ev?.detail?.guid;
      if (!guid) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = Math.floor(rect.width / 2);
      const y = Math.floor(rect.height / 2);
      const res = await fetch(`/obj/${guid}_obj.json`);
      const def = res.ok ? await res.json() : null;
      const sources = def?.connectors?.sources ?? [];
      const sinks = def?.connectors?.sinks ?? [];
      const connectors = [
        ...sources.map((s) => ({ id: s.id, kind: "source", name: s.label ?? s.id })),
        ...sinks.map((s) => ({ id: s.id, kind: "sink", name: s.label ?? s.id })),
      ];
      const id = `n_${getUUID().slice(0, 8)}`;
      addNode({ id, guid, name: def?.name ?? guid, x, y, connectors });
    } catch (err) {
      console.error("add-node failed", err);
    }
  });

  // Drag from palette → add node
  canvasEl.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  canvasEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    const data = e.dataTransfer?.getData("application/json");
    if (!data) return;
    try {
      const obj = JSON.parse(data);
      if (obj.type === "palette-item") {
        const rect = canvasEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const guid = obj.guid;
        // fetch object definition to get connectors
        try {
          const res = await fetch(`/obj/${guid}_obj.json`);
          const def = res.ok ? await res.json() : null;
          const sources = def?.connectors?.sources ?? [];
          const sinks = def?.connectors?.sinks ?? [];
          const connectors = [
            ...sources.map((s) => ({ id: s.id, kind: "source", name: s.label ?? s.id })),
            ...sinks.map((s) => ({ id: s.id, kind: "sink", name: s.label ?? s.id })),
          ];
          const id = `n_${getUUID().slice(0, 8)}`;
          addNode({ id, guid, name: def?.name ?? guid, x, y, connectors });
        } catch (err) {
          console.error("object def load failed", err);
        }
      }
    } catch { /* ignore */ }
  });

  // Mouse interactions for dragging and linking
  canvasEl.addEventListener("mousedown", (e) => {
    const { x, y } = toCanvas(e);
    const hit = hitTestNode(x, y);
    if (hit) {
      const node = hit.node;
      // check connector handles first
      const connHit = hitTestConnector(node, x, y);
      if (connHit) {
        if (connHit.kind === "source") {
          startLink({ nodeId: node.id, connectorId: connHit.id });
          updateLinkPreview({ x, y });
        } else if (connHit.kind === "sink") {
          // if linking, finish; else ignore
          const st = getState();
          if (st.linking) {
            finishLink({ nodeId: node.id, connectorId: connHit.id });
          }
        }
        return;
      }
      const offX = x - node.x, offY = y - node.y;
      dragging = { nodeId: node.id, offsetX: offX, offsetY: offY };
    } else {
      cancelLink();
    }
  });

  canvasEl.addEventListener("mousemove", (e) => {
    const { x, y } = toCanvas(e);
    if (dragging) {
      moveNode(dragging.nodeId, x - dragging.offsetX, y - dragging.offsetY);
    }
    const st = getState();
    if (st.linking) updateLinkPreview({ x, y });
  });

  window.addEventListener("mouseup", () => {
    dragging = null;
  });
  canvasEl.addEventListener("mouseleave", () => {
    dragging = null;
  });

  function toCanvas(e) {
    const rect = canvasEl.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function resize() {
    const { width, height } = canvasEl.getBoundingClientRect();
    if (width && height) {
      canvasEl.width = Math.floor(width);
      canvasEl.height = Math.floor(height);
      render();
      // also size the SVG overlay
      svgEl.setAttribute("width", String(Math.floor(width)));
      svgEl.setAttribute("height", String(Math.floor(height)));
    }
  }

  function render() {
    const state = getState();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawGrid(ctx, canvasEl.width, canvasEl.height);
    // draw edges (SVG)
    drawEdges(state);
    // draw nodes
    for (const n of state.nodes) drawNode(ctx, n);
  }

  function drawGrid(ctx, w, h) {
    ctx.strokeStyle = cssVar("--grid") || "#eee";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  function drawNode(ctx, node) {
    const x = node.x, y = node.y;
    const w = NODE_W, h = NODE_H;
    // body
    ctx.fillStyle = cssVar("--node-fill") || "#fff";
    ctx.strokeStyle = cssVar("--node-stroke") || "#4b89ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // @ts-ignore roundRect exists in canvas 2D
    ctx.roundRect(x - w / 2, y - h / 2, w, h, RADIUS);
    ctx.fill();
    ctx.stroke();
    // title bar
    ctx.fillStyle = cssVar("--node-title-bg") || "#f5f8ff";
    ctx.strokeStyle = cssVar("--node-title-stroke") || "#d0dbff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, 20, [RADIUS, RADIUS, 0, 0]);
    ctx.fill();
    ctx.stroke();
    // name text
    ctx.fillStyle = cssVar("--color-text") || "#2f3b52";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(node.name || node.guid, x - w / 2 + 8, y - h / 2 + 10);

    // connectors: left = sinks, right = sources
    const sinks = (node.connectors || []).filter((c) => c.kind === "sink");
    const sources = (node.connectors || []).filter((c) => c.kind === "source");
    const spacing = (h - 24) / Math.max(1, Math.max(sinks.length, sources.length) + 1);

    const connColor = cssVar("--conn") || "#4b89ff";
    for (let i = 0; i < sinks.length; i++) {
      const cy = y - h / 2 + 24 + spacing * (i + 1);
      drawConnector(ctx, x - w / 2, cy, "sink", connColor);
      // label
      ctx.fillStyle = cssVar("--color-text") || "#555";
      ctx.textAlign = "left";
      ctx.fillText(sinks[i].name, x - w / 2 + 12, cy);
    }
    for (let i = 0; i < sources.length; i++) {
      const cy = y - h / 2 + 24 + spacing * (i + 1);
      drawConnector(ctx, x + w / 2, cy, "source", connColor);
      // label
      ctx.fillStyle = cssVar("--color-text") || "#555";
      ctx.textAlign = "right";
      ctx.fillText(sources[i].name, x + w / 2 - 12, cy);
    }
  }

  function drawConnector(ctx, x, y, kind, color) {
    ctx.beginPath();
    ctx.fillStyle = color || (cssVar("--conn") || "#4b89ff");
    ctx.arc(x + (kind === "source" ? -6 : 6), y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function connectorPosition(node, connector) {
    const w = NODE_W, h = NODE_H;
    const sinks = (node.connectors || []).filter((c) => c.kind === "sink");
    const sources = (node.connectors || []).filter((c) => c.kind === "source");
    const spacing = (h - 24) / Math.max(1, Math.max(sinks.length, sources.length) + 1);
    const list = connector.kind === "sink" ? sinks : sources;
    const idx = list.findIndex((c) => c.id === connector.id);
    const cy = node.y - h / 2 + 24 + spacing * (idx + 1);
    const cx = connector.kind === "sink" ? (node.x - w / 2 + 6) : (node.x + w / 2 - 6);
    return { x: cx, y: cy };
  }

  function drawEdges(state) {
    // clear wires except defs
    const defs = svgEl.querySelector("defs");
    svgEl.innerHTML = "";
    if (defs) svgEl.appendChild(defs);

    function pathFor(a, b) {
      const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
      const c1x = a.x + dx, c1y = a.y;
      const c2x = b.x - dx, c2y = b.y;
      return `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
    }

    for (const e of state.edges) {
      const nFrom = state.nodes.find((n) => n.id === e.from.nodeId);
      const nTo = state.nodes.find((n) => n.id === e.to.nodeId);
      if (!nFrom || !nTo) continue;
      const cFrom = { id: e.from.connectorId, kind: "source" };
      const cTo = { id: e.to.connectorId, kind: "sink" };
      const a = connectorPosition(nFrom, cFrom);
      const b = connectorPosition(nTo, cTo);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathFor(a, b));
      const wire = cssVar("--wire") || "#4b89ff";
      path.setAttribute("stroke", wire);
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
      path.setAttribute("marker-end", "url(#arrow)");
      svgEl.appendChild(path);
    }

    // ghost linking
    const st = getState();
    if (st.linking && st.linking.toPreview) {
      const nFrom = st.nodes.find((n) => n.id === st.linking.from.nodeId);
      if (nFrom) {
        const a = connectorPosition(nFrom, { id: st.linking.from.connectorId, kind: "source" });
        const b = st.linking.toPreview;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathFor(a, b));
        path.setAttribute("stroke", "#9bb9ff");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-dasharray", "6 4");
        svgEl.appendChild(path);
      }
    }
  }

  function hitTestNode(x, y) {
    const state = getState();
    // iterate back to front
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const n = state.nodes[i];
      if (Math.abs(x - n.x) <= NODE_W / 2 && Math.abs(y - n.y) <= NODE_H / 2) {
        return { node: n };
      }
    }
    return null;
  }

  function hitTestConnector(node, x, y) {
    const w = NODE_W, h = NODE_H;
    const sinks = (node.connectors || []).filter((c) => c.kind === "sink");
    const sources = (node.connectors || []).filter((c) => c.kind === "source");
    const spacing = (h - 24) / Math.max(1, Math.max(sinks.length, sources.length) + 1);
    for (let i = 0; i < sinks.length; i++) {
      const cy = node.y - h / 2 + 24 + spacing * (i + 1);
      const cx = node.x - w / 2 + 6;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= 25) return { id: sinks[i].id, kind: "sink" };
    }
    for (let i = 0; i < sources.length; i++) {
      const cy = node.y - h / 2 + 24 + spacing * (i + 1);
      const cx = node.x + w / 2 - 6;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= 25) {
        return { id: sources[i].id, kind: "source" };
      }
    }
    return null;
  }
}
