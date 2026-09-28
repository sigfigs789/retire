import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { START_YEAR } from '../projection';
import { playgroundProjection, RETIREMENT_YEARS } from '../playground';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtAxis$ = (v) =>
  v >= 1e6 ? `$${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${v}`;

const fmtPct = (v) => `${v.toFixed(1)}%`;

const DEFAULTS = {
  initialValue: 200000,
  annualContribution: 20000,
  years: 30,
  arr: 7,
  inflation: 2.5,
  drawdownRate: 4,
  selfSS: 1800,
  spouseSS: 1800,
};

function Slider({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="setting-group">
      <label className="setting-label-text">{label} — {format(value)}</label>
      <div className="ss-slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ss-slider"
          style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// A scratchpad calculator with its own in-memory state. It never reads or
// writes the saved plan, check-ins or snapshots.
export default function Playground() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const { initialValue, annualContribution, years, arr, inflation, drawdownRate, selfSS, spouseSS } = inputs;
  const set = (key) => (value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const p = useMemo(() => playgroundProjection(inputs), [inputs]);
  const chartData = p.series.map((d) => ({ year: d.year, "Portfolio (today's $)": Math.round(d.balance) }));

  return (
    <div className="page">
      <div className="page-header">
        <h2>Playground</h2>
        <p className="subtitle">Scratchpad for retirement income in today's dollars. Nothing here is saved or touches your plan.</p>
      </div>

      <div className="settings-panel">
        <div className="settings-row playground-sliders">
          <Slider label="Starting Balance" value={initialValue} onChange={set('initialValue')} min={0} max={2000000} step={5000} format={fmt$} />
          <Slider label="Annual Contribution" value={annualContribution} onChange={set('annualContribution')} min={0} max={100000} step={1000} format={fmt$} />
          <Slider label="Years to Retirement" value={years} onChange={set('years')} min={1} max={50} step={1} format={(v) => `${v} yrs`} />
          <Slider label="Rate of Return" value={arr} onChange={set('arr')} min={0} max={15} step={0.1} format={fmtPct} />
          <Slider label="Inflation" value={inflation} onChange={set('inflation')} min={0} max={8} step={0.1} format={fmtPct} />
          <Slider label="Drawdown Rate" value={drawdownRate} onChange={set('drawdownRate')} min={1} max={10} step={0.1} format={fmtPct} />
          <Slider label="Your Social Security" value={selfSS} onChange={set('selfSS')} min={0} max={5000} step={50} format={(v) => `${fmt$(v)}/mo`} />
          <Slider label="Spouse's Social Security" value={spouseSS} onChange={set('spouseSS')} min={0} max={5000} step={50} format={(v) => `${fmt$(v)}/mo`} />
        </div>
        <div className="chart-toolbar" style={{ padding: '1rem 0 0' }}>
          <button className="chart-toggle-btn" onClick={() => setInputs(DEFAULTS)}>Reset</button>
        </div>
      </div>

      <div className="summary-row playground-summary">
        <div className="summary-card">
          <span className="summary-label">Annual Income (Today's $)</span>
          <span className="summary-value" style={{ color: '#34d399' }}>{fmt$(p.income)}</span>
          <span className="summary-sub">{fmt$(p.income / 12)}/mo · {drawdownRate.toFixed(1)}% rule + SS</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">From Portfolio ({drawdownRate.toFixed(1)}%)</span>
          <span className="summary-value teal">{fmt$(p.withdrawal)}</span>
          <span className="summary-sub">of {fmt$(p.atRetirement)} at retirement, today's $</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">From Social Security</span>
          <span className="summary-value" style={{ color: '#a78bfa' }}>{p.ssAnnual > 0 ? fmt$(p.ssAnnual) : '—'}</span>
          <span className="summary-sub">{fmt$(selfSS + spouseSS)}/mo combined</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Portfolio Lasts</span>
          <span className={`summary-value ${p.lastsYears ? 'negative' : 'positive'}`}>
            {p.lastsYears ? `${p.lastsYears} yrs` : `${RETIREMENT_YEARS}+ yrs`}
          </span>
          <span className="summary-sub">At a {fmtPct(p.realRate * 100)} real return</span>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickFormatter={(y) => START_YEAR + y} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtAxis$} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: '0.8rem' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '0.35rem' }}
              labelFormatter={(y) => START_YEAR + y}
              formatter={(v, name) => [fmt$(v), name]}
            />
            <ReferenceLine x={years} stroke="#6b7280" strokeDasharray="4 3" label={{ value: 'Retirement', position: 'insideTopRight', fill: '#6b7280', fontSize: 11 }} />
            <Line type="monotone" dataKey="Portfolio (today's $)" stroke="#2dd4bf" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
