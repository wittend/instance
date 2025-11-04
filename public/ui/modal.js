// Minimal modal helper
// Usage: showModal({ title, content, actions: [{label, onClick, kind}] })

export function showModal({ title = "", content = null, actions = [] } = {}) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
  });
  const dlg = document.createElement('div');
  Object.assign(dlg.style, {
    background: 'var(--panel-bg)', color: 'var(--color-text)', borderRadius: '8px', minWidth: '420px', maxWidth: '80vw',
    maxHeight: '80vh', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'grid',
    gridTemplateRows: 'auto 1fr auto', overflow: 'hidden', border: '1px solid var(--border)'
  });
  const header = document.createElement('div');
  header.textContent = title || 'Dialog';
  Object.assign(header.style, { padding: '10px 14px', background: 'var(--panel-header-bg)', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--color-text)' });
  const body = document.createElement('div');
  Object.assign(body.style, { padding: '12px', overflow: 'auto', color: 'var(--color-text)' });
  if (content instanceof HTMLElement) body.appendChild(content);
  else if (typeof content === 'string') body.innerHTML = content;
  const footer = document.createElement('div');
  Object.assign(footer.style, { padding: '10px 12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', background: 'var(--panel-footer-bg)' });

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };

  function onKey(e){
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);

  const defaultBtn = document.createElement('button');
  defaultBtn.textContent = 'Close';
  defaultBtn.className = 'button';
  defaultBtn.addEventListener('click', close);

  if (Array.isArray(actions) && actions.length) {
    for (const a of actions) {
      const b = document.createElement('button');
      b.textContent = a.label || 'Action';
      b.className = 'button';
      if (a.kind === 'danger') {
        b.style.background = '#fee2e2'; b.style.borderColor = '#ef4444'; b.style.color = '#991b1b';
      } else if (a.kind === 'primary') {
        b.style.background = '#eef2ff'; b.style.borderColor = '#6366f1'; b.style.color = '#4338ca';
      }
      b.addEventListener('click', async () => {
        try { await a.onClick?.({ close }); } catch (e) { console.error('modal action error', e); }
      });
      footer.appendChild(b);
    }
  } else {
    footer.appendChild(defaultBtn);
  }

  dlg.appendChild(header); dlg.appendChild(body); dlg.appendChild(footer);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);
  // return close function
  return { close };
}
