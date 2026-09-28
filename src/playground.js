import { projectValue } from './projection';

export const RETIREMENT_YEARS = 40;

// Balances come out in today's dollars, with `nominal` alongside. Savings grow
// at `arr`% nominal and are deflated by `inflation`%; in retirement the withdrawal is fixed in real terms
// at `drawdownRate`% of the retirement balance, and the balance earns the real
// return. Social Security is entered as today's-dollar monthly benefits.
export function playgroundProjection({ initialValue, annualContribution, years, arr, inflation, drawdownRate, selfSS, spouseSS }) {
  const deflate = (y) => Math.pow(1 + inflation / 100, y);
  const realRate = (1 + arr / 100) / (1 + inflation / 100) - 1;

  const series = [];
  for (let y = 0; y <= years; y++) {
    series.push({ year: y, balance: projectValue(initialValue, y, arr, annualContribution) / deflate(y) });
  }

  const atRetirement = series.at(-1).balance;
  const withdrawal = atRetirement * (drawdownRate / 100);
  const ssAnnual = (selfSS + spouseSS) * 12;

  let balance = atRetirement;
  let lastsYears = null;
  for (let i = 1; i <= RETIREMENT_YEARS; i++) {
    balance = balance * (1 + realRate) - withdrawal;
    if (balance <= 0) {
      series.push({ year: years + i, balance: 0 });
      lastsYears = i;
      break;
    }
    series.push({ year: years + i, balance });
  }

  series.forEach((d) => { d.nominal = d.balance * deflate(d.year); });

  return { series, atRetirement, withdrawal, ssAnnual, income: withdrawal + ssAnnual, realRate, lastsYears };
}
