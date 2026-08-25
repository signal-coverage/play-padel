import { describe, it, expect } from "vitest";
import { getMercadoPagoConnectionCopy } from "./utils";

describe("getMercadoPagoConnectionCopy", () => {
  it("returns loading copy when status is undefined", () => {
    const copy = getMercadoPagoConnectionCopy(undefined);

    expect(copy.badgeLabel).toBe("Loading…");
    expect(copy.ctaLabel).toBe("Connect Mercado Pago");
    expect(copy.showDisconnect).toBe(false);
  });

  it("returns not-connected copy with a destructive badge for MP_NOT_CONNECTED, with no disconnect action", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "MP_NOT_CONNECTED",
    });

    expect(copy.badgeLabel).toBe("Not connected");
    expect(copy.badgeVariant).toBe("destructive");
    expect(copy.ctaLabel).toBe("Connect Mercado Pago");
    expect(copy.showDisconnect).toBe(false);
  });

  it("returns inactive-club copy with a warning badge and a disconnect action for CLUB_INACTIVE", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "CLUB_INACTIVE",
    });

    expect(copy.badgeLabel).toBe("Connected");
    expect(copy.badgeVariant).toBe("warning");
    expect(copy.ctaLabel).toBe("Switch account");
    expect(copy.showDisconnect).toBe(true);
  });

  it("returns connected copy with a success badge and a disconnect action when operational", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
    });

    expect(copy.badgeLabel).toBe("Connected");
    expect(copy.badgeVariant).toBe("success");
    expect(copy.ctaLabel).toBe("Switch account");
    expect(copy.showDisconnect).toBe(true);
  });
});
