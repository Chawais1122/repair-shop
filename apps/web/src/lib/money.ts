/**
 * Client-side mirror of the API's invoice math, in integer cents so previews match the
 * server exactly (tax rounds half-up to the cent after the discount).
 */
export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
}

export function computeSaleTotals(
  lines: Array<{ quantity: number; unitPrice: number | string }>,
  discount: number,
  taxRatePercent: number,
): SaleTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + toCents(l.unitPrice) * l.quantity, 0);
  const discountCents = Math.min(toCents(discount || 0), subtotalCents);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * (taxRatePercent || 0)) / 100);
  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(taxableCents + taxCents),
  };
}
