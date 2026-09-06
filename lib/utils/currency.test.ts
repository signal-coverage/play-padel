import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCourtPrice,
  formatPricePerHour,
} from "./currency";

describe("formatCurrency", () => {
  // es-AR fixed everywhere (UI and PDF receipts alike) rather than the
  // viewer's browser/server-runtime locale — the same amount must render
  // identically regardless of who's looking or where it's rendered (a PDF
  // is generated server-side, where there's no real "browser locale" to
  // read anyway).
  it("formats using es-AR conventions (comma decimal separator, period thousands separator)", () => {
    // Intl's es-AR currency format puts a non-breaking space (U+00A0, built
    // via fromCharCode so the exact character is unambiguous in source)
    // between the "$" symbol and the number.
    const nbsp = String.fromCharCode(160);
    expect(formatCurrency(1234.5, "ARS")).toBe(`$${nbsp}1.234,50`);
  });

  it("falls back to a plain es-AR number format for an unrecognized currency code", () => {
    expect(formatCurrency(1234.5, "NOT_A_CURRENCY")).toBe("1.234,50");
  });
});

describe("formatCourtPrice", () => {
  it("prefixes the formatted number with a bare $", () => {
    expect(formatCourtPrice(8000)).toBe("$8,000.00");
  });

  it("formats decimals and thousands separators", () => {
    expect(formatCourtPrice(1234.5)).toBe("$1,234.50");
  });
});

describe("formatPricePerHour", () => {
  it("divides courtPrice by the shift length in hours", () => {
    expect(formatPricePerHour(12000, 90)).toBe("$8,000.00");
    expect(formatPricePerHour(12000, 60)).toBe("$12,000.00");
  });

  it("returns an em dash when courtPrice is unset or NaN", () => {
    expect(formatPricePerHour(undefined, 90)).toBe("—");
    expect(formatPricePerHour(Number.NaN, 90)).toBe("—");
  });

  it("returns an em dash when slotDurationMinutes is falsy", () => {
    expect(formatPricePerHour(12000, 0)).toBe("—");
    expect(formatPricePerHour(12000, undefined)).toBe("—");
  });
});
