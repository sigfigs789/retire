import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { START_YEAR, projectValue } from '../projection';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtAxis$ = (v) =>
  v >= 1e6 ? `$${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${v}`;

const DEFAULTS = { initialValue: 200000, years: 30, arr: 7, inflation: 2.5, annualContribution: 20000 };

// Read the saved calculator inputs once, without ever writing them back.
function savedPlan() {
  const read = (key, fallback) => {
    try {
      const stored = localStorage.getItem(`retire.basic.${key}`);
      return stored !== null ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };
  return Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, read(k, v)]));
}

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

// A scratchpad calculator: plain in-memory state, so nothing here touches the
// saved plan, check-ins or snapshots on the main page.
export default function Playground() {
  const [plan] = useState(savedPlan);
  const [inputs, setInputs] = useState(plan);
  const { initialValue, years, arr, inflation, annualContribution } = inputs;
  const set = (key) => (value) => setInputs((prev) => ({ ...prev, [key]: value }));

  const chartData = useMemo(
    () => Array.from({ length: years + 1 }, (_, year) => {
      const nominal = projectValue(initialValue, year, arr, annualContribution);
      return {
        year,
        Playground: Math.round(nominal),
        'Playground (today\'s $)': Math.round(nominal / Math.pow(1 + inflation / 100, year)),
        'Your plan': year <= plan.years
          ? Math.round(projectValue(plan.initialValue, year, plan.arr, plan.annualContribution))
          : undefined,
      };
    }),
    [initialValue, years, arr, inflation, annualContribution, plan]
  );

  const final = chartData.at(-1);
  const planFinal = projectValue(plan.initialValue, plan.years, plan.arr, plan.annualContribution);
  const diff = final.Playground - planFinal;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Playground</h2>
        <p className="subtitle">Try out numbers freely. Nothing here is saved or affects your plan, check-ins or snapshots.</p>
      </div>

      <div className="settings-panel">
        <div className="settings-row playground-sliders">
          <Slider label="Starting Balance" value={initialValue} onChange={set('initialValue')} min={0} max={2000000} step={5000} format={fmt$} />
          <Slider label="Annual Contribution" value={annualContribution} onChange={set('annualContribution')} min={0} max={100000} step={1000} format={fmt$} />
          <Slider label="Years" value={years} onChange={set('years')} min={1} max={50} step={1} format={(v) => `${v} yrs`} />
          <Slider label="Rate of Return" value={arr} onChange={set('arr')} min={0} max={15} step={0.1} format={(v) => `${v.toFixed(1)}%`} />
          <Slider label="Inflation" value={inflation} onChange={set('inflation')} min={0} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} />
        </div>
        <div className="chart-toolbar" style={{ padding: '1rem 0 0' }}>
          <button className="chart-toggle-btn" onClick={() => setInputs(plan)}>Reset to my plan</button>
        </div>
      </div>

      <div className="summary-row playground-summary">
        <div className="summary-card">
          <span className="summary-label">Playground at Year {years}</span>
          <span className="summary-value indigo">{fmt$(final.Playground)}</span>
          <span className="summary-sub">Nominal</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">In Today's $</span>
          <span className="summary-value teal">{fmt$(final['Playground (today\'s $)'])}</span>
          <span className="summary-sub">At {inflation.toFixed(1)}% inflation</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">vs Your Plan at Retirement</span>
          <span className={`summary-value ${diff >= 0 ? 'positive' : 'negative'}`}>{diff >= 0 ? '+' : ''}{fmt$(diff)}</span>
          <span className="summary-sub">Your plan: {fmt$(planFinal)}</span>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickFormatter={(y) => START_YEAR + y} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtAxis$} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: '0.8rem' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '0.35rem' }}
              labelFormatter={(y) => START_YEAR + y}
              formatter={(v, name) => [fmt$(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '0.75rem' }} />
            {plan.years <= years && <ReferenceLine x={plan.years} stroke="#6b7280" strokeDasharray="4 3" />}
            <Line type="monotone" dataKey="Your plan" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Playground" stroke="#818cf8" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="Playground (today's $)" stroke="#2dd4bf" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
