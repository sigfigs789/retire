import { projectValue, monthToT, tToMonth, fmtMonthT } from './projection';

test('month conversions round-trip from January 2026', () => {
  expect(monthToT('2026-01')).toBe(0);
  expect(monthToT('2026-09')).toBeCloseTo(8 / 12);
  expect(monthToT('2027-01')).toBe(1);
  expect(tToMonth(monthToT('2031-06'))).toBe('2031-06');
  expect(fmtMonthT(8 / 12)).toBe('Sep 2026');
});

test('projectValue matches the yearly formula at whole years', () => {
  const oneYear = 201252 * 1.07 + 24000;
  expect(projectValue(201252, 1, 7, 24000)).toBeCloseTo(oneYear);
  expect(projectValue(1000, 2, 0, 100)).toBe(1200);
});

test('re-projecting from an on-plan balance reproduces the original plan', () => {
  const t = monthToT('2026-09');
  const onPlan = projectValue(201252, t, 7, 24000);
  expect(projectValue(onPlan, 33 - t, 7, 24000)).toBeCloseTo(projectValue(201252, 33, 7, 24000), 2);
});

test('a higher contribution from a check-in onward raises the re-projection', () => {
  const t = monthToT('2026-09');
  const base = projectValue(250000, 33 - t, 7, 24000);
  const raised = projectValue(250000, 33 - t, 7, 30000);
  expect(raised).toBeGreaterThan(base);
});
