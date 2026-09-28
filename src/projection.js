// Plans start in January of START_YEAR; `t` is years since then (fractional for months).
export const START_YEAR = 2026;

// Balance after `t` years at `arr`% with `annualContribution` added each year.
export function projectValue(start, t, arr, annualContribution) {
  const r = arr / 100;
  const growth = Math.pow(1 + r, t);
  return start * growth + (r === 0 ? annualContribution * t : annualContribution * (growth - 1) / r);
}

// "2026-09" -> 8/12 (September is 8 months after January).
export function monthToT(month) {
  const [y, m] = month.split('-').map(Number);
  return ((y - START_YEAR) * 12 + (m - 1)) / 12;
}

export function tToMonth(t) {
  const total = Math.round(t * 12);
  const y = START_YEAR + Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function fmtMonthT(t) {
  const total = Math.round(t * 12);
  return new Date(START_YEAR + Math.floor(total / 12), total % 12, 1)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
