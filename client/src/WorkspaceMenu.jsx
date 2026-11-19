import { useRef, useState } from 'react';

export default function WorkspaceMenu({ links, view, follow }) {
  const panel = useRef(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="account-link" type="button" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { panel.current.showModal(); setOpen(true); }}>Menu</button>
      <dialog ref={panel} className="workspace-menu" aria-labelledby="workspace-menu-title"
        onClose={() => setOpen(false)} onClick={event => {
          if (event.target === event.currentTarget) panel.current.close();
        }}>
        <div className="workspace-menu-content">
          <header><h2 id="workspace-menu-title">Workspace</h2>
            <button className="product-secondary" type="button" onClick={() => panel.current.close()}>Close</button>
          </header>
          <nav aria-label="Workspace">
            {links.map((page, index) => (
              <a key={page.id} href={page.path} style={{ '--menu-order': index }}
                aria-current={view === page.id ? 'page' : undefined}
                onClick={event => {
                  follow(event);
                  if (event.defaultPrevented) panel.current.close();
                }}>{page.label}</a>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
