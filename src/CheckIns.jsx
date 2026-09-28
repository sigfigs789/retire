import { useState } from 'react';
import { monthToT, tToMonth, fmtMonthT, currentMonth } from './projection';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

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

// Check-ins: log the real balance for a month. The latest one re-projects
// the plan forward from that balance.
export default function CheckInPanel({ checkIns, validCheckIns, annualContribution, years, planAt, latest, reprojectedAtRetirement, planAtRetirement, onAdd, onDelete }) {
  const minMonth = tToMonth(1 / 12);
  const maxMonth = tToMonth(years - 1 / 12);
  const [month, setMonth] = useState(() => {
    const now = currentMonth();
    return now < minMonth ? minMonth : now > maxMonth ? maxMonth : now;
  });
  const [value, setValue] = useState('');
  const [contribution, setContribution] = useState('');

  const t = month ? monthToT(month) : NaN;
  const inRange = t > 0 && t < years;
  const canAdd = inRange && value !== '' && !isNaN(Number(value)) && (contribution === '' || !isNaN(Number(contribution)));

  // What a blank contribution would inherit for the chosen month.
  const inheritedContribution = [...validCheckIns].reverse().find((c) => c.t < t)?.effectiveContribution ?? annualContribution;

  const add = () => {
    if (!canAdd) return;
    onAdd(month, Number(value), contribution === '' ? null : Number(contribution));
    setValue('');
    setContribution('');
  };

  const effectiveByMonth = Object.fromEntries(validCheckIns.map((c) => [c.month, c.effectiveContribution]));

  const sorted = [...checkIns].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="panel-panel">
      <div className="panel-header">
        <div>
          <span className="setting-label-text">Check-ins</span>
          <p className="panel-hint">Enter your actual balance for a month to re-project from there.</p>
        </div>
        <div className="panel-take">
          <input
            type="month"
            className="panel-note-input"
            aria-label="Check-in month"
            min={minMonth}
            max={maxMonth}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <input
            type="number"
            className="panel-note-input"
            aria-label="Check-in balance"
            placeholder="Balance ($)"
            min={0}
            step={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <input
            type="number"
            className="panel-note-input"
            aria-label="New annual contribution (optional)"
            title="Optional. Applies from this month on; blank keeps the current contribution."
            placeholder={`Contribution/yr (${fmt$(inheritedContribution)})`}
            min={0}
            step={1000}
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="panel-btn panel-btn--primary" onClick={add} disabled={!canAdd}>Add check-in</button>
        </div>
      </div>

      {sorted.length > 0 && (
        <ul className="panel-list">
          {sorted.map((c) => {
            const ct = monthToT(c.month);
            const valid = ct > 0 && ct < years;
            const isLatest = latest?.month === c.month;
            return (
              <li key={c.month} className={`panel-item${isLatest ? ' panel-item--latest' : ''}`}>
                <div className="panel-meta">
                  <span className="panel-name">{fmtMonthT(ct)}: {fmt$(c.value)}{isLatest && <span className="panel-tag">Latest</span>}</span>
                  <span className="panel-sub">
                    {valid
                      ? <>
                          Plan expected {fmt$(planAt(ct))} · <Delta now={c.value} then={planAt(ct)} />
                          {' · '}
                          {c.contribution != null
                            ? <span className="checkin-contribution">Contribution changed to {fmt$(c.contribution)}/yr</span>
                            : <>{fmt$(effectiveByMonth[c.month])}/yr contributions</>}
                        </>
                      : 'Outside the plan window'}
                  </span>
                </div>
                <div className="panel-actions">
                  <button className="panel-btn" onClick={() => onDelete(c.month)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {latest && (
        <div className="panel-compare">
          <div className="panel-compare-item">
            <span className="summary-label">Re-projected at Retirement</span>
            <span className="panel-compare-value" style={{ color: '#a3e635' }}>{fmt$(reprojectedAtRetirement)}</span>
            <span className="muted">From {fmtMonthT(latest.t)} check-in</span>
          </div>
          <div className="panel-compare-item">
            <span className="summary-label">Original Plan at Retirement</span>
            <span className="panel-compare-value" style={{ color: '#818cf8' }}>{fmt$(planAtRetirement)}</span>
            <span className="muted">From Jan {tToMonth(0).slice(0, 4)} value</span>
          </div>
          <div className="panel-compare-item">
            <span className="summary-label">Difference</span>
            <Delta now={reprojectedAtRetirement} then={planAtRetirement} />
          </div>
        </div>
      )}
    </div>
  );
}
