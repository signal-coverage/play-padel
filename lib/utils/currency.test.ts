import { describe, expect, it } from "vitest";
import { formatCourtPrice, formatPricePerHour } from "./currency";

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
