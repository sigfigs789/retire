import { useState, useMemo } from 'react';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const START_YEAR = 2026;

const SS_LEVELS = [
  { label: '0',      monthly: 0 },
  { label: 'Low',    monthly: 1000 },
  { label: 'Median', monthly: 1800 },
  { label: 'Max',    monthly: 4018 },
];

function SSSlider({ label, value, onChange }) {
  return (
    <div className="setting-group">
      <label className="setting-label-text">{label}</label>
      <div className="ss-slider-wrap">
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ss-slider"
          style={{ '--pct': `${(value / 3) * 100}%` }}
        />
        <div className="ss-ticks">
          {SS_LEVELS.map((lvl, i) => (
            <span key={i} className={`ss-tick${value === i ? ' ss-tick--active' : ''}`}>{lvl.label}</span>
          ))}
        </div>
        <div className="ss-amount">{value === 0 ? 'No benefit' : `${fmt$(SS_LEVELS[value].monthly)}/mo`}</div>
      </div>
    </div>
  );
}

const DEFAULT_CASES = [
  { label: 'Conservative', arr: 5, inflation: 3 },
  { label: 'Moderate',     arr: 7, inflation: 2.5 },
  { label: 'Aggressive',   arr: 10, inflation: 2 },
];

function computeExpected(initialValue, years, arr, inflation, annualContribution) {
  return Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const r = arr / 100;
    const growth = Math.pow(1 + r, year);
    const expected = initialValue * growth + (r === 0 ? annualContribution * year : annualContribution * (growth - 1) / r);
    const inflAdj = expected / Math.pow(1 + inflation / 100, year);
    return { expected, inflAdj };
  });
}

export default function Advanced() {
  const [initialValue, setInitialValue] = useState(201252);
  const [years, setYears] = useState(33);
  const [cases, setCases] = useState(DEFAULT_CASES);
  const [actuals, setActuals] = useState({});
  const [selfSS, setSelfSS] = useState(3);
  const [spouseSS, setSpouseSS] = useState(3);
  const [drawdownRate, setDrawdownRate] = useState(4);
  const [annualContribution, setAnnualContribution] = useState(24000);

  const combinedSSMonthly = SS_LEVELS[selfSS].monthly + SS_LEVELS[spouseSS].monthly;
  const combinedSSAnnual = combinedSSMonthly * 12;

  const updateCase = (ci, field, value) => {
    setCases((prev) => prev.map((c, i) => i === ci ? { ...c, [field]: field === 'label' ? value : Number(value) } : c));
  };

  const projected = useMemo(() =>
    cases.map((c) => computeExpected(initialValue, years, c.arr, c.inflation, annualContribution)),
    [initialValue, years, cases, annualContribution]
  );

  const rows = useMemo(() =>
    Array.from({ length: years }, (_, i) => {
      const calYear = START_YEAR + i;
      const rawActual = actuals[i];
      const actual = rawActual !== undefined && rawActual !== '' ? parseFloat(rawActual) : null;
      const caseVals = projected.map((p) => {
        const { expected, inflAdj } = p[i];
        const pctDiff = actual !== null && !isNaN(actual) ? ((actual - expected) / expected) * 100 : null;
        const dollDiff = actual !== null && !isNaN(actual) ? actual - expected : null;
        return { expected, inflAdj, pctDiff, dollDiff };
      });
      return { i, calYear, actual, caseVals };
    }),
    [years, projected, actuals]
  );

  const handleActual = (index, value) => {
    setActuals((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Advanced Calculator</h2>
        <p className="subtitle">Compare up to 3 scenarios with independent ARR and inflation rates</p>
      </div>

      <div className="adv-settings">
        <div className="adv-global">
          <div className="setting-group">
            <label className="setting-label-text">Initial Portfolio Value</label>
            <div className="field-input">
              <span className="field-suffix" style={{ paddingLeft: '0.75rem', paddingRight: '0.25rem' }}>$</span>
              <input
                type="number"
                value={initialValue}
                min={0}
                step={1000}
                onChange={(e) => setInitialValue(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label-text">Years to Retirement</label>
            <div className="field-input">
              <input
                type="number"
                value={years}
                min={1}
                max={50}
                step={1}
                onChange={(e) => setYears(Math.max(1, Math.min(50, Number(e.target.value))))}
              />
              <span className="field-suffix">yrs</span>
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label-text">Annual Contribution</label>
            <div className="field-input">
              <span className="field-suffix" style={{ paddingLeft: '0.75rem', paddingRight: '0.25rem' }}>$</span>
              <input
                type="number"
                value={annualContribution}
                min={0}
                step={1000}
                onChange={(e) => setAnnualContribution(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="settings-row settings-row--ss" style={{ marginTop: '1.5rem' }}>
          <SSSlider label="Your Social Security" value={selfSS} onChange={setSelfSS} />
          <SSSlider label="Spouse's Social Security" value={spouseSS} onChange={setSpouseSS} />
          <div className="setting-group">
            <label className="setting-label-text">Drawdown Rate — {drawdownRate.toFixed(1)}%</label>
            <div className="ss-slider-wrap">
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={drawdownRate}
                onChange={(e) => setDrawdownRate(Number(e.target.value))}
                className="ss-slider"
                style={{ '--pct': `${((drawdownRate - 1) / 9) * 100}%` }}
              />
              <div className="ss-ticks" style={{ justifyContent: 'space-between' }}>
                <span className="ss-tick">1%</span>
                <span className="ss-tick">4%</span>
                <span className="ss-tick">7%</span>
                <span className="ss-tick">10%</span>
              </div>
            </div>
          </div>
          <div className="setting-group" style={{ justifyContent: 'flex-end' }}>
            <div className="summary-card" style={{ minWidth: 160 }}>
              <span className="summary-label">Combined SS Income</span>
              <span className="summary-value" style={{ color: '#a78bfa' }}>{combinedSSAnnual > 0 ? fmt$(combinedSSAnnual) : '—'}</span>
              <span className="summary-sub">{combinedSSMonthly > 0 ? `${fmt$(combinedSSMonthly)}/mo combined` : 'No SS benefit selected'}</span>
            </div>
          </div>
        </div>

        <div className="case-cards">
          {cases.map((c, ci) => (
            <div className="case-card" key={ci}>
              <input
                className="case-name-input"
                value={c.label}
                onChange={(e) => updateCase(ci, 'label', e.target.value)}
              />
              <div className="case-fields">
                <div className="setting-group">
                  <label className="setting-label-text">ARR</label>
                  <div className="field-input">
                    <input
                      type="number"
                      value={c.arr}
                      min={0}
                      max={50}
                      step={0.1}
                      onChange={(e) => updateCase(ci, 'arr', e.target.value)}
                    />
                    <span className="field-suffix">%</span>
                  </div>
                </div>
                <div className="setting-group">
                  <label className="setting-label-text">Inflation</label>
                  <div className="field-input">
                    <input
                      type="number"
                      value={c.inflation}
                      min={0}
                      max={20}
                      step={0.1}
                      onChange={(e) => updateCase(ci, 'inflation', e.target.value)}
                    />
                    <span className="field-suffix">%</span>
                  </div>
                </div>
              </div>
              <div className="case-summary-row">
                <div className="case-summary-item">
                  <span className="case-summary-label">At Retirement</span>
                  <span className="case-summary-value indigo">{fmt$(projected[ci]?.at(-1)?.expected ?? 0)}</span>
                </div>
                <div className="case-summary-item">
                  <span className="case-summary-label">Today's $</span>
                  <span className="case-summary-value teal">{fmt$(projected[ci]?.at(-1)?.inflAdj ?? 0)}</span>
                </div>
                <div className="case-summary-item">
                  <span className="case-summary-label">Expected Income/yr</span>
                  <span className="case-summary-value" style={{ color: '#34d399' }}>
                    {fmt$((projected[ci]?.at(-1)?.expected ?? 0) * (drawdownRate / 100) + combinedSSAnnual)}
                  </span>
                  <span className="case-summary-sub">{drawdownRate}% rule + SS</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th rowSpan={2}>Year</th>
              {cases.map((c, ci) => (
                <th key={ci} colSpan={2} className="case-header">{c.label}</th>
              ))}
              <th rowSpan={2}>Actual</th>
              {cases.map((c, ci) => (
                <th key={ci} className="vs-header">vs {c.label}</th>
              ))}
            </tr>
            <tr>
              {cases.map((_, ci) => (
                <>
                  <th key={`e-${ci}`} className="sub-header">Expected</th>
                  <th key={`i-${ci}`} className="sub-header muted">Infl. Adj.</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.i}>
                <td className="col-year">{row.calYear}</td>
                {row.caseVals.map((cv, ci) => (
                  <>
                    <td key={`e-${ci}`}>{fmt$(cv.expected)}</td>
                    <td key={`i-${ci}`} className="muted">{fmt$(cv.inflAdj)}</td>
                  </>
                ))}
                <td>
                  <div className="actual-wrap">
                    <span className="actual-dollar">$</span>
                    <input
                      type="number"
                      className="actual-input"
                      placeholder="—"
                      value={actuals[row.i] ?? ''}
                      onChange={(e) => handleActual(row.i, e.target.value)}
                    />
                  </div>
                </td>
                {row.caseVals.map((cv, ci) => {
                  const has = cv.pctDiff !== null;
                  const pos = has && cv.pctDiff >= 0;
                  return (
                    <td key={`vs-${ci}`}>
                      {has ? (
                        <span className={`badge ${pos ? 'badge-green' : 'badge-red'}`}>
                          {fmtPct(cv.pctDiff)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
