import { playgroundProjection, RETIREMENT_YEARS } from './playground';

const base = { initialValue: 100000, annualContribution: 0, years: 10, arr: 7, inflation: 0, drawdownRate: 4, selfSS: 0, spouseSS: 0 };

test('with no inflation, real equals nominal growth', () => {
  const p = playgroundProjection(base);
  expect(p.atRetirement).toBeCloseTo(100000 * Math.pow(1.07, 10));
  expect(p.withdrawal).toBeCloseTo(p.atRetirement * 0.04);
});

test('deflates the retirement balance to today\'s dollars', () => {
  const p = playgroundProjection({ ...base, inflation: 3 });
  expect(p.atRetirement).toBeCloseTo((100000 * Math.pow(1.07, 10)) / Math.pow(1.03, 10));
});

test('adds both Social Security benefits to income', () => {
  const p = playgroundProjection({ ...base, selfSS: 1500, spouseSS: 1000 });
  expect(p.ssAnnual).toBe(30000);
  expect(p.income).toBeCloseTo(p.withdrawal + 30000);
});

test('balance never runs out when the real return covers the withdrawal', () => {
  const p = playgroundProjection({ ...base, arr: 7, inflation: 2, drawdownRate: 4 });
  expect(p.lastsYears).toBeNull();
  expect(p.series).toHaveLength(base.years + 1 + RETIREMENT_YEARS);
});

test('reports how long the money lasts with a high drawdown', () => {
  const p = playgroundProjection({ ...base, arr: 3, inflation: 3, drawdownRate: 12 });
  expect(p.lastsYears).toBe(9);
  expect(p.series.at(-1).balance).toBe(0);
});
