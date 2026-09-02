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

  it("includes the account label for CLUB_INACTIVE when nickname and email are present", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "CLUB_INACTIVE",
      email: "owner@club.com",
      nickname: "clubowner",
    });

    expect(copy.accountLabel).toBe("clubowner (owner@club.com)");
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

  it("returns accountLabel: null when status is undefined (loading)", () => {
    const copy = getMercadoPagoConnectionCopy(undefined);

    expect(copy.accountLabel).toBeNull();
  });

  it("returns accountLabel: null for MP_NOT_CONNECTED", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: false,
      cause: "MP_NOT_CONNECTED",
    });

    expect(copy.accountLabel).toBeNull();
  });

  it('builds accountLabel as "nickname (email)" when both are present', () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });

    expect(copy.accountLabel).toBe("clubowner (owner@club.com)");
  });

  it("builds accountLabel as the bare email when only email is present", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: null,
    });

    expect(copy.accountLabel).toBe("owner@club.com");
  });

  it("builds accountLabel as the bare nickname when only nickname is present", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
      email: null,
      nickname: "clubowner",
    });

    expect(copy.accountLabel).toBe("clubowner");
  });

  it("builds accountLabel as null when neither email nor nickname is present", () => {
    const copy = getMercadoPagoConnectionCopy({
      operational: true,
      cause: null,
      email: null,
      nickname: null,
    });

    expect(copy.accountLabel).toBeNull();
  });
});
