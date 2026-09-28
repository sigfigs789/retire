import { niceStep, fitYAxis, fmtAxis$, fitXAxis, fmtYearTick } from './chartZoom';

test('niceStep rounds up to 1/2/2.5/5 x 10^n', () => {
  expect(niceStep(0.8)).toBe(1);
  expect(niceStep(13000)).toBe(20000);
  expect(niceStep(2400)).toBe(2500);
  expect(niceStep(41)).toBe(50);
  expect(niceStep(700)).toBe(1000);
});

test('fitYAxis fits only the visible window, interpolating at the edges', () => {
  const data = [
    { year: 0, A: 0 },
    { year: 10, A: 1000 },
    { year: 20, A: 5000 },
  ];
  // Window 5..15 sees A=500 at left, 1000 inside, 3000 at right.
  const { domain, ticks } = fitYAxis(data, ['A'], 5, 15);
  expect(domain[0]).toBeLessThanOrEqual(500);
  expect(domain[1]).toBeGreaterThanOrEqual(3000);
  expect(domain[1]).toBeLessThan(5000);
  expect(ticks[0]).toBe(domain[0]);
  expect(ticks.at(-1)).toBe(domain[1]);
});

test('fitYAxis ignores keys that are not passed in', () => {
  const data = [{ year: 0, A: 100, B: 1e9 }, { year: 1, A: 200, B: 1e9 }];
  expect(fitYAxis(data, ['A'], 0, 1).domain[1]).toBeLessThan(1000);
  expect(fitYAxis(data, [], 0, 1)).toBeNull();
});

test('fmtAxis$ adds precision so close ticks stay distinct', () => {
  expect(fmtAxis$(1_500_000)).toBe('$1.5M');
  expect(fmtAxis$(250_000)).toBe('$250k');
  const { ticks, step } = fitYAxis([{ year: 0, A: 1_200_000 }, { year: 1, A: 1_230_000 }], ['A'], 0, 1);
  const labels = ticks.map((t) => fmtAxis$(t, step));
  expect(new Set(labels).size).toBe(labels.length);
});

test('fitXAxis switches to months for short windows', () => {
  expect(fitXAxis(0, 30)).toEqual([0, 5, 10, 15, 20, 25, 30]);
  expect(fitXAxis(2, 4)).toEqual([2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]);
  expect(fmtYearTick(3)).toBe('2029');
  expect(fmtYearTick(3.5)).toBe('Jul 2029');
});
