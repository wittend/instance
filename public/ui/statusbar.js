let statusEl;
let dirty = false;
export function initStatusbar(container){
  statusEl = container;
  setStatus('Initializing...');
}
export function setStatus(text){
  if (statusEl) statusEl.textContent = (dirty ? '* ' : '') + text;
}
export function setDirty(isDirty){
  dirty = !!isDirty;
  // reapply current text to include dirty marker
  if (statusEl) statusEl.textContent = (dirty ? '* ' : '') + (statusEl.textContent?.replace(/^\*\s+/, '') || '');
}
