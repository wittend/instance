// SPDX-License-Identifier: GPL-3.0-or-later

// Core project graph model and serialization/validation utilities
// Shared conceptually with frontend, but this is the server-side TS version for validation and tests.

export interface Connector {
  id: string; // unique within node
  kind: "source" | "sink";
  name: string;
}

export interface Node {
  id: string; // unique within project
  guid: string; // references palette/object definition
  name?: string; // display name
  x: number;
  y: number;
  connectors?: Connector[]; // optional: may be defined by object def instead
  code?: Record<string, string>; // optional: instance-specific code overrides
}

export interface EdgeEnd {
  nodeId: string;
  connectorId: string; // must exist on node
}

export interface Edge {
  id: string;
  from: EdgeEnd; // must be a source connector
  to: EdgeEnd;   // must be a sink connector
}

export interface ProjectData {
  id: string; // filename without `_prj.json`
  name?: string;
  version: number; // schema version
  nodes: Node[];
  edges: Edge[];
  // Optional free-form metadata
  meta?: Record<string, unknown>;
}

export const CURRENT_SCHEMA_VERSION = 1;

export class GraphValidationError extends Error {
  details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "GraphValidationError";
    this.details = details;
  }
}

export function createProject(id: string, name?: string): ProjectData {
  return { id, name, version: CURRENT_SCHEMA_VERSION, nodes: [], edges: [] };
}

export function addNode(project: ProjectData, node: Node): void {
  if (project.nodes.some((n) => n.id === node.id)) {
    throw new GraphValidationError(`Duplicate node id: ${node.id}`);
  }
  project.nodes.push(node);
}

export function moveNode(project: ProjectData, nodeId: string, x: number, y: number): void {
  const n = project.nodes.find((n) => n.id === nodeId);
  if (!n) throw new GraphValidationError(`Node not found: ${nodeId}`);
  n.x = x; n.y = y;
}

export function removeNode(project: ProjectData, nodeId: string): void {
  const idx = project.nodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return;
  project.nodes.splice(idx, 1);
  // remove edges touching this node
  project.edges = project.edges.filter((e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId);
}

function getConnectorKind(project: ProjectData, end: EdgeEnd): "source" | "sink" | undefined {
  const node = project.nodes.find((n) => n.id === end.nodeId);
  const conn = node?.connectors?.find((c) => c.id === end.connectorId);
  return conn?.kind;
}

export function addEdge(project: ProjectData, edge: Edge): void {
  if (project.edges.some((e) => e.id === edge.id)) {
    throw new GraphValidationError(`Duplicate edge id: ${edge.id}`);
  }
  // validate endpoints
  const fromKind = getConnectorKind(project, edge.from);
  const toKind = getConnectorKind(project, edge.to);
  if (fromKind !== "source") {
    throw new GraphValidationError(`Edge.from must reference a source connector`, [JSON.stringify(edge)]);
  }
  if (toKind !== "sink") {
    throw new GraphValidationError(`Edge.to must reference a sink connector`, [JSON.stringify(edge)]);
  }
  project.edges.push(edge);
}

export function removeEdge(project: ProjectData, edgeId: string): void {
  const idx = project.edges.findIndex((e) => e.id === edgeId);
  if (idx !== -1) project.edges.splice(idx, 1);
}

export function serialize(project: ProjectData): string {
  validateProject(project); // throws if invalid
  return JSON.stringify(project);
}

export function deserialize(json: string): ProjectData {
  const obj = JSON.parse(json);
  validateProject(obj);
  return obj as ProjectData;
}

export function validateProject(project: any): asserts project is ProjectData {
  const errors: string[] = [];
  if (!project || typeof project !== "object") errors.push("project must be object");
  if (typeof project.id !== "string" || !project.id) errors.push("id must be non-empty string");
  if (typeof project.version !== "number") errors.push("version must be number");
  if (!Array.isArray(project.nodes)) errors.push("nodes must be array");
  if (!Array.isArray(project.edges)) errors.push("edges must be array");

  const nodeIds = new Set<string>();
  const connectorIndex = new Map<string, Map<string, Connector>>(); // nodeId -> (connectorId -> Connector)

  if (Array.isArray(project.nodes)) {
    for (const n of project.nodes) {
      if (typeof n.id !== "string" || !n.id) errors.push("node.id must be string");
      if (nodeIds.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
      nodeIds.add(n.id);
      if (typeof n.guid !== "string" || !n.guid) errors.push(`node.guid must be string [${n.id}]`);
      if (typeof n.x !== "number" || typeof n.y !== "number") errors.push(`node.x/y must be numbers [${n.id}]`);
      if (n.code !== undefined && (typeof n.code !== "object" || n.code === null)) {
        errors.push(`node.code must be object [${n.id}]`);
      }
      if (n.connectors !== undefined) {
        if (!Array.isArray(n.connectors)) errors.push(`node.connectors must be array [${n.id}]`);
        const seen = new Set<string>();
        const cmap = new Map<string, Connector>();
        for (const c of (n.connectors ?? [])) {
          if (typeof c.id !== "string" || !c.id) errors.push(`connector.id must be string [node ${n.id}]`);
          if (seen.has(c.id)) errors.push(`duplicate connector id ${c.id} on node ${n.id}`);
          seen.add(c.id);
          if (c.kind !== "source" && c.kind !== "sink") errors.push(`connector.kind invalid [node ${n.id}]`);
          if (typeof c.name !== "string") errors.push(`connector.name must be string [node ${n.id}]`);
          if (c.id) cmap.set(c.id, c);
        }
        connectorIndex.set(n.id, cmap);
      } else {
        connectorIndex.set(n.id, new Map());
      }
    }
  }

  const edgeIds = new Set<string>();
  if (Array.isArray(project.edges)) {
    for (const e of project.edges) {
      if (typeof e.id !== "string" || !e.id) errors.push("edge.id must be string");
      if (edgeIds.has(e.id)) errors.push(`duplicate edge id: ${e.id}`);
      edgeIds.add(e.id);
      for (const key of ["from", "to"] as const) {
        const end = e[key];
        if (!end || typeof end !== "object") { errors.push(`edge.${key} must be object [${e.id}]`); continue; }
        if (typeof end.nodeId !== "string" || !nodeIds.has(end.nodeId)) errors.push(`edge.${key}.nodeId unknown [${e.id}]`);
        if (typeof end.connectorId !== "string" || !end.connectorId) errors.push(`edge.${key}.connectorId must be string [${e.id}]`);
      }
      // Kind checks only if connectors known
      const fromKind = connectorIndex.get(e.from?.nodeId ?? "")?.get(e.from?.connectorId ?? "")?.kind;
      const toKind = connectorIndex.get(e.to?.nodeId ?? "")?.get(e.to?.connectorId ?? "")?.kind;
      if (fromKind && fromKind !== "source") errors.push(`edge.from must be source [${e.id}]`);
      if (toKind && toKind !== "sink") errors.push(`edge.to must be sink [${e.id}]`);
    }
  }

  if (errors.length) {
    throw new GraphValidationError("Project validation failed", errors);
  }
}
