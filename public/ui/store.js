// Simple in-memory client-side store for project graph
// Schema mirrors server's lib/graph.ts shape (JS version)

const subscribers = new Set();

let state = {
  id: null, // project id without suffix
  name: null,
  version: 1,
  nodes: [],
  edges: [],
  dirty: false,
  linking: null, // { from: { nodeId, connectorId }, toPreview: {x,y} }
};

export function subscribe(fn){ subscribers.add(fn); return () => subscribers.delete(fn); }
function emit(){ for(const fn of subscribers) fn(getState()); }
export function getState(){ return structuredClone(state); }

function markDirty(d=true){ state.dirty = d; emit(); }

export function newProject(id = null, name = null){
  state = { id, name, version: 1, nodes: [], edges: [], dirty: false, linking: null };
  emit();
}

export function setProjectId(id){ state.id = id; markDirty(false); }
export function markSaved(){ state.dirty = false; emit(); }

export function loadProject(data){
  // expects { id, name?, version, nodes, edges }
  state = { ...data, dirty: false, linking: null };
  emit();
}

export function addNode({ id, guid, name, x, y, connectors }){
  state.nodes.push({ id, guid, name, x, y, connectors });
  markDirty(true);
}

export function moveNode(nodeId, x, y){
  const n = state.nodes.find(n=>n.id===nodeId);
  if(!n) return;
  n.x = x; n.y = y;
  markDirty(true);
}

export function removeNode(nodeId){
  state.nodes = state.nodes.filter(n=>n.id!==nodeId);
  state.edges = state.edges.filter(e=> e.from.nodeId!==nodeId && e.to.nodeId!==nodeId);
  markDirty(true);
}

export function startLink(from){
  state.linking = { from, toPreview: null };
  emit();
}
export function updateLinkPreview(point){
  if(state.linking){ state.linking.toPreview = point; emit(); }
}
export function cancelLink(){ state.linking = null; emit(); }

export function finishLink(to){
  if(!state.linking) return;
  const from = state.linking.from;
  // prevent duplicate ids
  const id = `e_${crypto.randomUUID().slice(0,8)}`;
  state.edges.push({ id, from, to });
  state.linking = null;
  markDirty(true);
}

export function serializeProject(){
  const { id, name, version, nodes, edges } = state;
  return { id: id ?? "untitled", name, version: typeof version === 'number' ? version : 1, nodes, edges };
}
