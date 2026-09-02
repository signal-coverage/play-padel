// Argentine peso convention already used elsewhere in this app: period as
// the thousands separator, no decimals for whole-peso amounts.
export function formatCurrency(amount: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(amount)}`;
}

// The effective per-month price when paying the annual price up front,
// rounded to the nearest whole peso — this is what the big price number
// shows when the "Annual" billing toggle is selected.
export function getAnnualMonthlyEquivalent(annualPrice: number): number {
  return Math.round(annualPrice / 12);
}

// How many months' worth of the monthly price the annual price saves,
// computed rather than hardcoded so it stays correct if pricing changes.
// (Currently exactly 2 months across every priced tier.)
export function getSavingsMonths(
  monthlyPrice: number,
  annualPrice: number,
): number {
  return Math.round((monthlyPrice * 12 - annualPrice) / monthlyPrice);
}
