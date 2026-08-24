import { describe, it, expect } from "vitest";
import { getMercadoPagoConnectionCopy } from "./utils";

describe("getMercadoPagoConnectionCopy", () => {
  it("returns loading copy when status is undefined", () => {
    const copy = getMercadoPagoConnectionCopy(undefined);

    expect(copy.badgeLabel).toBe("Loading…");
    expect(copy.ctaLabel).toBe("Connect Mercado Pago");
  });

  it("returns not-connected copy with a destructive badge for MP_NOT_CONNECTED", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "MP_NOT_CONNECTED",
    });

    expect(copy.badgeLabel).toBe("Not connected");
    expect(copy.badgeVariant).toBe("destructive");
    expect(copy.ctaLabel).toBe("Connect Mercado Pago");
  });

  it("returns inactive-club copy with a warning badge for CLUB_INACTIVE", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "CLUB_INACTIVE",
    });

    expect(copy.badgeLabel).toBe("Connected");
    expect(copy.badgeVariant).toBe("warning");
    expect(copy.ctaLabel).toBe("Reconnect Mercado Pago");
  });

  it("returns connected copy with a success badge when operational", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
    });

    expect(copy.badgeLabel).toBe("Connected");
    expect(copy.badgeVariant).toBe("success");
    expect(copy.ctaLabel).toBe("Reconnect Mercado Pago");
  });
});
