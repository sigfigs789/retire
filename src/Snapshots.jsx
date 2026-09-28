import { useState } from 'react';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const snapshotLabel = (s) => (s.note ? `${s.note} (${fmtDate(s.takenAt)})` : fmtDate(s.takenAt));

function Delta({ now, then }) {
  const diff = now - then;
  const pct = then !== 0 ? (diff / then) * 100 : 0;
  const positive = diff >= 0;
  return (
    <span className={positive ? 'positive' : 'negative'}>
      {positive ? '+' : '−'}{fmt$(Math.abs(diff))} ({positive ? '+' : '−'}{Math.abs(pct).toFixed(1)}%)
    </span>
  );
}

// Saved baselines: capture the current plan with a timestamp, then compare
// today's projection against any saved one later.
export default function SnapshotPanel({ snapshots, selected, current, onTake, onSelect, onRestore, onDelete }) {
  const [note, setNote] = useState('');

  const take = () => {
    onTake(note.trim());
    setNote('');
  };

  return (
    <div className="snapshot-panel">
      <div className="snapshot-header">
        <div>
          <span className="setting-label-text">Snapshots</span>
          <p className="snapshot-hint">Save today's plan, then compare against it later.</p>
        </div>
        <div className="snapshot-take">
          <input
            className="snapshot-note-input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && take()}
          />
          <button className="snapshot-btn snapshot-btn--primary" onClick={take}>Take snapshot</button>
        </div>
      </div>

      {snapshots.length > 0 && (
        <ul className="snapshot-list">
          {snapshots.map((s) => {
            const isSelected = selected?.id === s.id;
            return (
              <li key={s.id} className={`snapshot-item${isSelected ? ' snapshot-item--selected' : ''}`}>
                <div className="snapshot-meta">
                  <span className="snapshot-name">{snapshotLabel(s)}</span>
                  <span className="snapshot-sub">
                    {fmt$(s.inputs.initialValue)} start · {fmt$(s.finalExpected)} at {s.retirementYear}
                  </span>
                </div>
                <div className="snapshot-actions">
                  <button className={`snapshot-btn${isSelected ? ' snapshot-btn--active' : ''}`} onClick={() => onSelect(isSelected ? null : s.id)}>
                    {isSelected ? 'Comparing' : 'Compare'}
                  </button>
                  <button className="snapshot-btn" onClick={() => onRestore(s)}>Restore inputs</button>
                  <button
                    className="snapshot-btn"
                    onClick={() => window.confirm(`Delete snapshot "${snapshotLabel(s)}"?`) && onDelete(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="snapshot-compare">
          <div className="snapshot-compare-item">
            <span className="summary-label">Nominal at Retirement</span>
            <span className="snapshot-compare-value">{fmt$(current.finalExpected)} <span className="muted">now</span></span>
            <span className="snapshot-compare-value">{fmt$(selected.finalExpected)} <span className="muted">then</span></span>
            <Delta now={current.finalExpected} then={selected.finalExpected} />
          </div>
          <div className="snapshot-compare-item">
            <span className="summary-label">Inflation-Adjusted at Retirement</span>
            <span className="snapshot-compare-value">{fmt$(current.finalInflAdj)} <span className="muted">now</span></span>
            <span className="snapshot-compare-value">{fmt$(selected.finalInflAdj)} <span className="muted">then</span></span>
            <Delta now={current.finalInflAdj} then={selected.finalInflAdj} />
          </div>
          <div className="snapshot-compare-item">
            <span className="summary-label">Portfolio Value</span>
            <span className="snapshot-compare-value">{fmt$(current.initialValue)} <span className="muted">now</span></span>
            <span className="snapshot-compare-value">{fmt$(selected.inputs.initialValue)} <span className="muted">then</span></span>
            <Delta now={current.initialValue} then={selected.inputs.initialValue} />
          </div>
        </div>
      )}
    </div>
  );
}
