// Fixed to es-AR — not the viewer's browser locale — so the same amount
// renders identically everywhere it's shown, including the PDF receipt
// (lib/pdf/ReceiptDocument/utils.ts, generated server-side where there's no
// real "browser locale" to read from anyway).
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
    }).format(amount);
  }
}

// Bare "$" prefix, no currency code — ARS is the only currency in play for
// now (see ClubCourtsPanel / the owner-side court pricing fields), unlike
// formatCurrency's locale-aware display used elsewhere (receipts, booking
// dialogs).
export function formatCourtPrice(price: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
  }).format(price);
  return `$${formatted}`;
}

// courtPrice / hours-in-shift — used by both the owner's CourtFormSheet (live
// as they edit) and the player-facing ClubCourtsPanel (from already-saved
// values). Guards against an unset/NaN courtPrice or a falsy
// slotDurationMinutes, either of which would otherwise produce `$NaN` or a
// divide-by-zero.
export function formatPricePerHour(
  courtPrice: number | undefined,
  slotDurationMinutes: number | undefined,
): string {
  if (
    courtPrice === undefined ||
    Number.isNaN(courtPrice) ||
    !slotDurationMinutes
  ) {
    return "—";
  }
  return formatCourtPrice(courtPrice / (slotDurationMinutes / 60));
}
