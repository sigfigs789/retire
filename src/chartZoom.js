import { START_YEAR, fmtMonthT } from './projection';

// Round a raw tick step up to 1, 2, 2.5 or 5 times a power of ten.
export function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

// Value of `key` at `x`, linearly interpolated between the nearest points that
// have it (the chart draws lines with connectNulls, so gaps are bridged too).
function valueAt(data, key, x) {
  let prev = null;
  for (const d of data) {
    if (d[key] == null) continue;
    if (d.year === x) return d[key];
    if (d.year > x) {
      if (!prev) return null;
      return prev[key] + ((d[key] - prev[key]) * (x - prev.year)) / (d.year - prev.year);
    }
    prev = d;
  }
  return null;
}

// Y domain and round ticks that fit the visible `keys` between `left` and `right`.
export function fitYAxis(data, keys, left, right, tickCount = 5) {
  let lo = Infinity;
  let hi = -Infinity;
  const take = (v) => {
    if (v == null || Number.isNaN(v)) return;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  };
  for (const key of keys) {
    take(valueAt(data, key, left));
    take(valueAt(data, key, right));
    data.forEach((d) => { if (d.year > left && d.year < right) take(d[key]); });
  }
  if (lo === Infinity) return null;
  if (lo === hi) { lo -= Math.max(1, Math.abs(lo) * 0.05); hi += Math.max(1, Math.abs(hi) * 0.05); }

  const step = niceStep((hi - lo) / (tickCount - 1));
  const min = Math.max(0, Math.floor(lo / step) * step);
  const max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { domain: [min, max], ticks, step };
}

// Fewest decimals that show `x` exactly (up to 3).
function decimalsFor(x) {
  let d = 0;
  while (d < 3 && Math.abs(Math.round(x * 10 ** d) - x * 10 ** d) > 1e-6) d++;
  return d;
}

// Dollar axis label; with a tick `step`, adds decimals so neighbours never repeat.
export function fmtAxis$(v, step) {
  if (Math.abs(v) >= 1e6) {
    const d = step ? Math.max(1, decimalsFor(step / 1e6), decimalsFor(v / 1e6)) : 1;
    return `$${(v / 1e6).toFixed(Math.min(d, 3))}M`;
  }
  const d = step ? Math.max(decimalsFor(step / 1e3), decimalsFor(v / 1e3)) : 0;
  return `$${(v / 1e3).toFixed(Math.min(d, 3))}k`;
}

const X_STEPS = [1 / 12, 0.25, 0.5, 1, 2, 5, 10];

// Year-axis ticks for a zoomed window; month steps once the window is short.
export function fitXAxis(left, right, maxTicks = 8) {
  const step = X_STEPS.find((s) => (right - left) / s <= maxTicks) ?? 10;
  const ticks = [];
  for (let i = Math.ceil(left / step - 1e-9); i * step <= right + 1e-9; i++) {
    ticks.push(Number((i * step).toPrecision(12)));
  }
  return ticks;
}

export function fmtYearTick(t) {
  return Math.abs(t - Math.round(t)) < 1e-9 ? String(START_YEAR + Math.round(t)) : fmtMonthT(t);
}
