import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import usePersistentState from '../usePersistentState';
import SnapshotPanel, { snapshotLabel } from '../Snapshots';
import CheckInPanel from '../CheckIns';
import { START_YEAR, projectValue, monthToT, fmtMonthT } from '../projection';
import LineMenu from '../LineMenu';
import { fitYAxis, fitXAxis, fmtAxis$, fmtYearTick } from '../chartZoom';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);


// Older check-in re-projections cycle through these; the latest is always lime.
const OLDER_REPROJECTION_COLORS = ['#fde047', '#fb923c', '#c084fc', '#38bdf8', '#f87171'];

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
  const [initialValue, setInitialValue] = usePersistentState('retire.basic.initialValue', 201252);
  const [years, setYears] = usePersistentState('retire.basic.years', 33);
  const [arr, setArr] = usePersistentState('retire.basic.arr', 7);
  const [inflation, setInflation] = usePersistentState('retire.basic.inflation', 2.5);
  const [selfSS, setSelfSS] = usePersistentState('retire.basic.selfSS', 3);
  const [spouseSS, setSpouseSS] = usePersistentState('retire.basic.spouseSS', 3);
  const [drawdownRate, setDrawdownRate] = usePersistentState('retire.basic.drawdownRate', 4);
  const [annualContribution, setAnnualContribution] = usePersistentState('retire.basic.annualContribution', 24000);
  const [showFullLifetime, setShowFullLifetime] = usePersistentState('retire.basic.showFullLifetime', false);
  const [snapshots, setSnapshots] = usePersistentState('retire.basic.snapshots', []);
  const [compareId, setCompareId] = usePersistentState('retire.basic.compareSnapshotId', null);
  const compareSnapshot = snapshots.find((s) => s.id === compareId) ?? null;
  const [checkIns, setCheckIns] = usePersistentState('retire.basic.checkIns', []);
  // The Jan START_YEAR value anchors the original plan, so once check-ins exist
  // it's locked; new balances go in as check-ins instead of overwriting it.
  const [originalUnlocked, setOriginalUnlocked] = useState(false);
  const originalLocked = checkIns.length > 0 && !originalUnlocked;
  // Only lines the user has toggled are stored; everything else uses its default.
  const [lineOverrides, setLineOverrides] = usePersistentState('retire.basic.lineOverrides', {});
  // Zoomed x-range ({ left, right } in years since START_YEAR) and the in-progress drag.
  const [zoom, setZoom] = useState(null);
  const [drag, setDrag] = useState(null);

  const rows = useMemo(() => {
    return Array.from({ length: years }, (_, i) => {
      const year = i + 1;
      const calYear = START_YEAR + i;
      const expected = projectValue(initialValue, year, arr, annualContribution);
      const inflAdj = expected / Math.pow(1 + inflation / 100, year);
      return { year, calYear, expected, inflAdj };
    });
  }, [initialValue, years, arr, inflation, annualContribution]);

  const finalExpected = rows.at(-1)?.expected ?? 0;
  const finalInflAdj = rows.at(-1)?.inflAdj ?? 0;

  const combinedSSMonthly = SS_LEVELS[selfSS].monthly + SS_LEVELS[spouseSS].monthly;
  const combinedSSAnnual = combinedSSMonthly * 12;

  const POST_RETIREMENT_ARR = 0.05;
  const POST_RETIREMENT_INFLATION = 0.03;
  const POST_RETIREMENT_YEARS = 35;

  // The latest check-in inside the accumulation window drives the re-projection:
  // same rate and contributions, but starting from the real balance on that month.
  const validCheckIns = useMemo(() =>
    checkIns
      .map((c) => ({ ...c, t: monthToT(c.month), key: `Re-projected ${c.month}` }))
      .filter((c) => c.t > 0 && c.t < years)
      .sort((a, b) => a.t - b.t),
    [checkIns, years]
  );
  const latestCheckIn = validCheckIns.at(-1) ?? null;

  const reprojectedAtRetirement = latestCheckIn
    ? projectValue(latestCheckIn.value, years - latestCheckIn.t, arr, annualContribution)
    : null;

  const reprojectedAtYear = (year) =>
    latestCheckIn && year >= latestCheckIn.t
      ? projectValue(latestCheckIn.value, year - latestCheckIn.t, arr, annualContribution)
      : null;

  // Withdrawal is fixed in real terms: it starts at drawdownRate% of the
  // retirement balance and grows with inflation each year after that.
  const drawdownFrom = (balance) => {
    let withdrawal = balance * (drawdownRate / 100);
    let value = balance;
    let inflFactor = Math.pow(1 + inflation / 100, years);
    const points = [];
    for (let i = 1; i <= POST_RETIREMENT_YEARS; i++) {
      value = value * (1 + POST_RETIREMENT_ARR) - withdrawal;
      withdrawal *= (1 + POST_RETIREMENT_INFLATION);
      inflFactor *= (1 + POST_RETIREMENT_INFLATION);
      points.push({ year: years + i, nominal: Math.max(0, Math.round(value)), real: Math.max(0, Math.round(value / inflFactor)) });
      if (value <= 0) break;
    }
    return points;
  };

  // `year` is years since Jan START_YEAR and can be fractional for check-ins.
  const chartData = useMemo(() => {
    const byYear = new Map();
    const point = (year) => {
      if (!byYear.has(year)) byYear.set(year, { year });
      return byYear.get(year);
    };
    const plan = (year) => {
      const expected = projectValue(initialValue, year, arr, annualContribution);
      Object.assign(point(year), {
        Expected: Math.round(expected),
        'Infl. Adjusted': Math.round(expected / Math.pow(1 + inflation / 100, year)),
      });
    };

    for (let year = 0; year <= years; year++) plan(year);
    drawdownFrom(finalExpected).forEach((d) => Object.assign(point(d.year), { Expected: d.nominal, 'Infl. Adjusted': d.real }));

    checkIns.forEach((c) => {
      const t = monthToT(c.month);
      if (t <= 0 || t > years) return;
      plan(t);
      point(t)['Check-in'] = c.value;
    });

    // Every check-in gets its own re-projection; the line menu decides which show.
    validCheckIns.forEach((c) => {
      point(c.t)[c.key] = c.value;
      for (let year = Math.floor(c.t) + 1; year <= years; year++) {
        point(year)[c.key] = Math.round(projectValue(c.value, year - c.t, arr, annualContribution));
      }
      const atRetirement = projectValue(c.value, years - c.t, arr, annualContribution);
      drawdownFrom(atRetirement).forEach((d) => { point(d.year)[c.key] = d.nominal; });
    });

    return [...byYear.values()].sort((a, b) => a.year - b.year);
  }, [rows, finalExpected, drawdownRate, inflation, years, initialValue, arr, annualContribution, checkIns, validCheckIns]);

  const lineOptions = [
    { key: 'Expected', label: 'Original plan', color: '#818cf8' },
    { key: 'Infl. Adjusted', label: 'Original plan (inflation-adjusted)', color: '#2dd4bf' },
    ...(checkIns.length > 0 ? [{ key: 'Check-in', label: 'Check-in points', color: '#f59e0b' }] : []),
    ...[...validCheckIns].reverse().map((c, i) => ({
      key: c.key,
      label: `Re-projected from ${fmtMonthT(c.t)}${c === latestCheckIn ? ' (latest)' : ''}`,
      color: c === latestCheckIn ? '#a3e635' : OLDER_REPROJECTION_COLORS[(i - 1) % OLDER_REPROJECTION_COLORS.length],
      defaultVisible: c === latestCheckIn,
    })),
    ...(compareSnapshot ? [{ key: 'Snapshot', label: `Snapshot: ${snapshotLabel(compareSnapshot)}`, color: '#f472b6' }] : []),
  ];
  const lineColor = Object.fromEntries(lineOptions.map((o) => [o.key, o.color]));
  const isVisible = (key) => lineOverrides[key] ?? lineOptions.find((o) => o.key === key)?.defaultVisible ?? true;
  const toggleLine = (key) => setLineOverrides((prev) => ({ ...prev, [key]: !isVisible(key) }));

  const addCheckIn = (month, value) => {
    setCheckIns((prev) => [...prev.filter((c) => c.month !== month), { month, value }]);
  };

  const deleteCheckIn = (month) => {
    setCheckIns((prev) => prev.filter((c) => c.month !== month));
  };

  // Snapshot series are keyed by calendar year so a plan saved in an earlier
  // year still lines up with today's projection.
  const snapshotByCalYear = useMemo(
    () => new Map((compareSnapshot?.series ?? []).map((p) => [p.calYear, p])),
    [compareSnapshot]
  );

  const displayChartData = useMemo(() => {
    const visible = showFullLifetime ? chartData : chartData.filter(d => d.year <= years);
    if (!compareSnapshot) return visible;
    return visible.map((d) => {
      const snap = Number.isInteger(d.year) ? snapshotByCalYear.get(START_YEAR + d.year - 1) : null;
      return snap ? { ...d, Snapshot: snap.expected } : d;
    });
  }, [chartData, showFullLifetime, years, compareSnapshot, snapshotByCalYear]);

  const visibleKeys = lineOptions.map((o) => o.key).filter(isVisible);
  const yAxisFit = zoom ? fitYAxis(displayChartData, visibleKeys, zoom.left, zoom.right) : null;
  const xTicks = zoom ? fitXAxis(zoom.left, zoom.right) : undefined;

  const labelOf = (e) => (e && e.activeLabel != null ? Number(e.activeLabel) : null);
  // A press before the chart has seen any hover has no label yet, so the
  // first move after it fills in the start.
  const startDrag = (e) => {
    const x = labelOf(e);
    setDrag({ start: x, end: x });
  };
  const moveDrag = (e) => {
    const x = labelOf(e);
    if (drag && x !== null) setDrag((d) => d && { start: d.start ?? x, end: x });
  };
  const endDrag = (e) => {
    const end = labelOf(e) ?? drag?.end;
    if (drag && drag.start !== null && end !== null && drag.start !== end) {
      setZoom({ left: Math.min(drag.start, end), right: Math.max(drag.start, end) });
    }
    setDrag(null);
  };
  const setRange = (full) => {
    setShowFullLifetime(full);
    setZoom(null);
  };

  const takeSnapshot = (note) => {
    const snapshot = {
      id: Date.now().toString(36),
      takenAt: new Date().toISOString(),
      note,
      inputs: { initialValue, years, arr, inflation, annualContribution, selfSS, spouseSS, drawdownRate },
      series: chartData
        .filter((d) => Number.isInteger(d.year) && d.year >= 1)
        .map((d) => ({ calYear: START_YEAR + d.year - 1, expected: d.Expected, inflAdj: d['Infl. Adjusted'] })),
      finalExpected,
      finalInflAdj,
      retirementYear: START_YEAR + years - 1,
    };
    setSnapshots((prev) => [snapshot, ...prev]);
  };

  const restoreSnapshot = ({ inputs }) => {
    setInitialValue(inputs.initialValue);
    setYears(inputs.years);
    setArr(inputs.arr);
    setInflation(inputs.inflation);
    setAnnualContribution(inputs.annualContribution);
    setSelfSS(inputs.selfSS);
    setSpouseSS(inputs.spouseSS);
    setDrawdownRate(inputs.drawdownRate);
  };

  const deleteSnapshot = (id) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    if (id === compareId) setCompareId(null);
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
            <label className="setting-label-text">Portfolio Value (Jan {START_YEAR})</label>
            <div className="field-input">
              <span className="field-suffix" style={{ paddingLeft: '0.75rem', paddingRight: '0.25rem' }}>$</span>
              <input
                type="number"
                value={initialValue}
                min={0}
                step={1000}
                disabled={originalLocked}
                onChange={(e) => setInitialValue(Number(e.target.value))}
              />
            </div>
            {originalLocked && (
              <span className="field-hint">
                Locked: add new balances as check-ins.{' '}
                <button className="link-btn" onClick={() => setOriginalUnlocked(true)}>Edit</button>
              </span>
            )}
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

      <CheckInPanel
        checkIns={checkIns}
        years={years}
        planAt={(t) => projectValue(initialValue, t, arr, annualContribution)}
        latest={latestCheckIn}
        reprojectedAtRetirement={reprojectedAtRetirement}
        planAtRetirement={finalExpected}
        onAdd={addCheckIn}
        onDelete={deleteCheckIn}
      />

      <SnapshotPanel
        snapshots={snapshots}
        selected={compareSnapshot}
        current={{ initialValue, finalExpected, finalInflAdj }}
        onTake={takeSnapshot}
        onSelect={setCompareId}
        onRestore={restoreSnapshot}
        onDelete={deleteSnapshot}
      />

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
          <span className="summary-label">Expected Annual Income (Today's $)</span>
          <span className="summary-value" style={{ color: '#34d399' }}>{fmt$(finalInflAdj * (drawdownRate / 100) + combinedSSAnnual)}</span>
          <span className="summary-sub">{drawdownRate}% rule + SS ({fmt$(finalInflAdj * (drawdownRate / 100) / 12)}/mo stocks), inflation-adjusted</span>
        </div>
      </div>

      <div className="chart-wrap">
        <div className="chart-toolbar">
          <button className={`chart-toggle-btn${!showFullLifetime ? ' active' : ''}`} onClick={() => setRange(false)}>To Retirement</button>
          <button className={`chart-toggle-btn${showFullLifetime ? ' active' : ''}`} onClick={() => setRange(true)}>Full Lifetime</button>
          {zoom ? (
            <button className="chart-toggle-btn" onClick={() => setZoom(null)}>
              Reset zoom ({fmtYearTick(zoom.left)} – {fmtYearTick(zoom.right)})
            </button>
          ) : (
            <span className="chart-hint">Drag across the chart to zoom</span>
          )}
          <LineMenu options={lineOptions} isVisible={isVisible} onToggle={toggleLine} />
        </div>
        <div className={`chart-zoom${drag ? ' chart-zoom--dragging' : ''}`} onDoubleClick={() => setZoom(null)}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={displayChartData}
            margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
            onMouseDown={startDrag}
            onMouseMove={moveDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="year"
              type="number"
              domain={zoom ? [zoom.left, zoom.right] : ['dataMin', 'dataMax']}
              ticks={xTicks}
              allowDataOverflow
              allowDecimals={false}
              tickFormatter={fmtYearTick}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={yAxisFit?.domain ?? ['auto', 'auto']}
              ticks={yAxisFit?.ticks}
              allowDataOverflow={!!yAxisFit}
              tickFormatter={(v) => fmtAxis$(v, yAxisFit?.step)}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', fontSize: '0.8rem' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '0.35rem' }}
              labelFormatter={fmtMonthT}
              formatter={(v, name) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '0.75rem' }} />
            <ReferenceLine x={years} stroke="#6b7280" strokeDasharray="4 3" label={{ value: `Retirement (${POST_RETIREMENT_ARR * 100}% ARR post)`, position: 'insideTopRight', fill: '#6b7280', fontSize: 11 }} />
            {isVisible('Expected') && (
              <Line type="monotone" dataKey="Expected" name="Original plan" stroke="#818cf8" strokeWidth={2} dot={false} connectNulls isAnimationActive={!zoom} />
            )}
            {isVisible('Infl. Adjusted') && (
              <Line type="monotone" dataKey="Infl. Adjusted" stroke="#2dd4bf" strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls isAnimationActive={!zoom} />
            )}
            {validCheckIns.filter((c) => isVisible(c.key)).map((c) => (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                name={`Re-projected (${fmtMonthT(c.t)})`}
                stroke={lineColor[c.key]}
                strokeWidth={2}
                strokeOpacity={c === latestCheckIn ? 1 : 0.7}
                dot={false}
                connectNulls
                isAnimationActive={!zoom}
              />
            ))}
            {checkIns.length > 0 && isVisible('Check-in') && (
              <Line type="monotone" dataKey="Check-in" stroke="#f59e0b" strokeWidth={0} dot={{ r: 5, fill: '#f59e0b', stroke: '#0c0c14', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} legendType="circle" />
            )}
            {compareSnapshot && isVisible('Snapshot') && (
              <Line type="monotone" dataKey="Snapshot" name={`Snapshot: ${snapshotLabel(compareSnapshot)}`} stroke="#f472b6" strokeWidth={2} dot={false} strokeDasharray="2 3" isAnimationActive={!zoom} />
            )}
            {drag && drag.start !== null && drag.start !== drag.end && (
              <ReferenceArea x1={drag.start} x2={drag.end} fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeOpacity={0.5} />
            )}
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Expected</th>
              <th>Infl. Adjusted</th>
              {latestCheckIn && <th>Re-projected</th>}
              {compareSnapshot && <th>Snapshot</th>}
              {compareSnapshot && <th>Now vs Snapshot</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year}>
                <td className="col-year">{row.calYear}</td>
                <td>{fmt$(row.expected)}</td>
                <td className="muted">{fmt$(row.inflAdj)}</td>
                {latestCheckIn && (() => {
                  const re = reprojectedAtYear(row.year);
                  return <td className={re === null ? 'muted' : ''} style={re !== null ? { color: '#a3e635' } : undefined}>{re === null ? '—' : fmt$(re)}</td>;
                })()}
                {compareSnapshot && (() => {
                  const snap = snapshotByCalYear.get(row.calYear);
                  if (!snap) return <><td className="muted">—</td><td className="muted">—</td></>;
                  const diff = row.expected - snap.expected;
                  return (
                    <>
                      <td className="muted">{fmt$(snap.expected)}</td>
                      <td className={diff >= 0 ? 'positive' : 'negative'}>{diff >= 0 ? '+' : ''}{fmt$(diff)}</td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
