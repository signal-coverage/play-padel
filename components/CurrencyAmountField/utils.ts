const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatPriceDisplay(value: number | undefined): string {
  return value === undefined || Number.isNaN(value)
    ? ""
    : priceFormatter.format(value);
}

export function parsePriceInput(text: string): number | undefined {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly === "" ? undefined : Number(digitsOnly);
}
