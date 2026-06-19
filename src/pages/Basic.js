import { useState, useMemo } from 'react';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const SS_LEVELS = [
  { label: '0',      monthly: 0 },
  { label: 'Low',    monthly: 1000 },
  { label: 'Median', monthly: 1800 },
  { label: 'Max',    monthly: 4018 },
];

function Field({ label, value, onChange, min, max, step = 0.1, suffix = '' }) {
  return (
    <div className="setting-group">
      <label className="setting-label-text">{label}</label>
      <div className="field-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

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

export default function Basic() {
  const [initialValue, setInitialValue] = useState(201252);
  const [years, setYears] = useState(33);
  const [arr, setArr] = useState(7);
  const [inflation, setInflation] = useState(2.5);
  const [actuals, setActuals] = useState({});
  const [selfSS, setSelfSS] = useState(3);
  const [spouseSS, setSpouseSS] = useState(3);
  const [drawdownRate, setDrawdownRate] = useState(4);
  const [annualContribution, setAnnualContribution] = useState(24000);

  const rows = useMemo(() => {
    return Array.from({ length: years }, (_, i) => {
      const year = i + 1;
      const calYear = 2026 + i;
      const r = arr / 100;
      const growth = Math.pow(1 + r, year);
      const expected = initialValue * growth + (r === 0 ? annualContribution * year : annualContribution * (growth - 1) / r);
      const inflAdj = expected / Math.pow(1 + inflation / 100, year);
      const rawActual = actuals[year];
      const actual = rawActual !== undefined && rawActual !== '' ? parseFloat(rawActual) : null;
      const pctDiff = actual !== null && !isNaN(actual) ? ((actual - expected) / expected) * 100 : null;
      const dollDiff = actual !== null && !isNaN(actual) ? actual - expected : null;
      return { year, calYear, expected, inflAdj, actual, pctDiff, dollDiff };
    });
  }, [initialValue, years, arr, inflation, actuals]);

  const finalExpected = rows.at(-1)?.expected ?? 0;
  const finalInflAdj = rows.at(-1)?.inflAdj ?? 0;

  const combinedSSMonthly = SS_LEVELS[selfSS].monthly + SS_LEVELS[spouseSS].monthly;
  const combinedSSAnnual = combinedSSMonthly * 12;

  const handleActual = (year, value) => {
    setActuals((prev) => ({ ...prev, [year]: value }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Basic Calculator</h2>
        <p className="subtitle">Global rates applied uniformly across all years</p>
      </div>

      <div className="settings-panel">
        <div className="settings-row">
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
          <Field label="Years to Retirement" value={years} onChange={setYears} min={1} max={50} step={1} suffix="yrs" />
          <Field label="Annual Rate of Return" value={arr} onChange={setArr} min={0} max={20} step={0.1} suffix="%" />
          <Field label="Inflation Rate" value={inflation} onChange={setInflation} min={0} max={10} step={0.1} suffix="%" />
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
        </div>
      </div>

      <div className="summary-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="summary-card">
          <span className="summary-label">Nominal at Retirement</span>
          <span className="summary-value indigo">{fmt$(finalExpected)}</span>
          <span className="summary-sub">Year {years} projected</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Inflation-Adjusted (Today's $)</span>
          <span className="summary-value teal">{fmt$(finalInflAdj)}</span>
          <span className="summary-sub">At {inflation}% annual inflation</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Real Return Rate</span>
          <span className="summary-value gold">{(arr - inflation).toFixed(1)}%</span>
          <span className="summary-sub">ARR minus inflation</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Combined SS Income</span>
          <span className="summary-value" style={{ color: '#a78bfa' }}>{combinedSSAnnual > 0 ? fmt$(combinedSSAnnual) : '—'}</span>
          <span className="summary-sub">{combinedSSMonthly > 0 ? `${fmt$(combinedSSMonthly)}/mo combined` : 'No SS benefit selected'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Expected Annual Income</span>
          <span className="summary-value" style={{ color: '#34d399' }}>{fmt$(finalExpected * (drawdownRate / 100) + combinedSSAnnual)}</span>
          <span className="summary-sub">{drawdownRate}% rule + SS ({fmt$(finalExpected * (drawdownRate / 100) / 12)}/mo stocks)</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Expected</th>
              <th>Infl. Adjusted</th>
              <th>Actual</th>
              <th>$ vs Expected</th>
              <th>% vs Expected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasActual = row.pctDiff !== null;
              const positive = hasActual && row.pctDiff >= 0;
              return (
                <tr key={row.year} className={hasActual ? (positive ? 'row-positive' : 'row-negative') : ''}>
                  <td className="col-year">{row.calYear}</td>
                  <td>{fmt$(row.expected)}</td>
                  <td className="muted">{fmt$(row.inflAdj)}</td>
                  <td>
                    <div className="actual-wrap">
                      <span className="actual-dollar">$</span>
                      <input
                        type="number"
                        className="actual-input"
                        placeholder="—"
                        value={actuals[row.year] ?? ''}
                        onChange={(e) => handleActual(row.year, e.target.value)}
                      />
                    </div>
                  </td>
                  <td className={hasActual ? (positive ? 'positive' : 'negative') : 'muted'}>
                    {hasActual ? fmt$(row.dollDiff) : '—'}
                  </td>
                  <td>
                    {hasActual ? (
                      <span className={`badge ${positive ? 'badge-green' : 'badge-red'}`}>
                        {fmtPct(row.pctDiff)}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
