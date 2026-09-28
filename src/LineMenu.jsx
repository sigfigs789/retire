import { useEffect, useRef, useState } from 'react';

// Dropdown checklist for choosing which chart lines are drawn.
export default function LineMenu({ options, isVisible, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const shown = options.filter((o) => isVisible(o.key)).length;

  return (
    <div className="line-menu" ref={ref}>
      <button className="chart-toggle-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Lines ({shown}/{options.length}) ▾
      </button>
      {open && (
        <div className="line-menu-list" role="menu">
          {options.map((o) => (
            <label key={o.key} className="line-menu-item" role="menuitemcheckbox" aria-checked={isVisible(o.key)}>
              <input type="checkbox" checked={isVisible(o.key)} onChange={() => onToggle(o.key)} />
              <span className="line-menu-swatch" style={{ background: o.color }} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
