import { describe, it, expect } from "vitest";
import {
  isMembershipConfirmed,
  resolveServerStep,
  resolveCheckoutAmount,
  isAutomatedCheckoutAvailable,
  resolveCheckoutErrorMessage,
} from "./utils";

describe("isMembershipConfirmed", () => {
  it("returns true for ACTIVE", () => {
    expect(isMembershipConfirmed("ACTIVE")).toBe(true);
  });

  it("returns true for TRIALING", () => {
    expect(isMembershipConfirmed("TRIALING")).toBe(true);
  });

  it("returns false for PENDING, PAST_DUE, and CANCELLED", () => {
    expect(isMembershipConfirmed("PENDING")).toBe(false);
    expect(isMembershipConfirmed("PAST_DUE")).toBe(false);
    expect(isMembershipConfirmed("CANCELLED")).toBe(false);
  });
});

describe("resolveServerStep", () => {
  it("returns 'loading' while the query is loading, regardless of data", () => {
    expect(
      resolveServerStep({
        isLoading: true,
        isError: false,
        subscription: null,
      }),
    ).toBe("loading");
  });

  it("returns 'error' when the query failed", () => {
    expect(
      resolveServerStep({
        isLoading: false,
        isError: true,
        subscription: null,
      }),
    ).toBe("error");
  });

  it("returns 'confirmed' when the subscription status is ACTIVE or TRIALING", () => {
    expect(
      resolveServerStep({
        isLoading: false,
        isError: false,
        subscription: { status: "ACTIVE" } as never,
      }),
    ).toBe("confirmed");
    expect(
      resolveServerStep({
        isLoading: false,
        isError: false,
        subscription: { status: "TRIALING" } as never,
      }),
    ).toBe("confirmed");
  });

  it("returns 'select' when loaded, not errored, and not confirmed (incl. no subscription yet)", () => {
    expect(
      resolveServerStep({
        isLoading: false,
        isError: false,
        subscription: { status: "PENDING" } as never,
      }),
    ).toBe("select");
    expect(
      resolveServerStep({
        isLoading: false,
        isError: false,
        subscription: null,
      }),
    ).toBe("select");
  });

  it("prioritizes 'loading' over a stale confirmed subscription from a previous fetch", () => {
    expect(
      resolveServerStep({
        isLoading: true,
        isError: false,
        subscription: { status: "ACTIVE" } as never,
      }),
    ).toBe("loading");
  });
});

describe("resolveCheckoutAmount", () => {
  it("returns the monthly price for MONTHLY", () => {
    expect(resolveCheckoutAmount("BASIC", "MONTHLY")).toBe(30000);
  });

  it("returns the annual price for ANNUAL", () => {
    expect(resolveCheckoutAmount("BASIC", "ANNUAL")).toBe(300000);
  });

  it("returns null for MAX on either cycle (no fixed price)", () => {
    expect(resolveCheckoutAmount("MAX", "MONTHLY")).toBeNull();
    expect(resolveCheckoutAmount("MAX", "ANNUAL")).toBeNull();
  });
});

describe("isAutomatedCheckoutAvailable", () => {
  it("is false for MAX (contact-us tier, per spec's Explicitly Not Covered)", () => {
    expect(isAutomatedCheckoutAvailable("MAX")).toBe(false);
  });

  it("is true for BASIC, PRO, and PLUS", () => {
    expect(isAutomatedCheckoutAvailable("BASIC")).toBe(true);
    expect(isAutomatedCheckoutAvailable("PRO")).toBe(true);
    expect(isAutomatedCheckoutAvailable("PLUS")).toBe(true);
  });
});

describe("resolveCheckoutErrorMessage", () => {
  it("appends a support-contact instruction to the server's own message", () => {
    expect(resolveCheckoutErrorMessage("Card declined by issuer.")).toBe(
      "Card declined by issuer. If this keeps happening, contact support.",
    );
  });

  it("appends the same instruction to the generic fallback message", () => {
    expect(
      resolveCheckoutErrorMessage("Something went wrong. Please try again."),
    ).toBe(
      "Something went wrong. Please try again. If this keeps happening, contact support.",
    );
  });
});
