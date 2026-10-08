import { computeSaleTotals, toCents } from './money';

describe('computeSaleTotals', () => {
  it('matches the API: discount before tax, tax rounded to the cent', () => {
    const totals = computeSaleTotals(
      [
        { quantity: 2, unitPrice: '19.99' },
        { quantity: 1, unitPrice: 10 },
      ],
      5,
      8.25,
    );
    expect(totals).toEqual({ subtotal: 49.98, discount: 5, taxAmount: 3.71, total: 48.69 });
  });

  it('clamps the discount to the subtotal', () => {
    const totals = computeSaleTotals([{ quantity: 1, unitPrice: 10 }], 25, 0);
    expect(totals.discount).toBe(10);
    expect(totals.total).toBe(0);
  });

  it('avoids floating point drift on cents', () => {
    const totals = computeSaleTotals([{ quantity: 3, unitPrice: 0.1 }], 0, 0);
    expect(totals.total).toBe(0.3);
  });

  it('treats missing tax and discount as zero', () => {
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 5 }], NaN, NaN).total).toBe(5);
  });
});

describe('toCents', () => {
  it('rounds to the nearest cent', () => {
    expect(toCents('12.345')).toBe(1235);
    expect(toCents(0.07)).toBe(7);
  });
});
