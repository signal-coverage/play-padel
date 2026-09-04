import { describe, it, expect } from "vitest";
import { PLAN_ORDER } from "./consts";

describe("PLAN_ORDER", () => {
  // Regression guard: PLAN_ORDER is the ONLY place that drives the visible
  // plan picker (ChangePlanDialog maps over it). "FREE" is a hidden,
  // admin-only plan tier activated via the internal admin route/page — it
  // must never appear here, or a real club owner could select it.
  it("never includes the hidden admin-only FREE plan", () => {
    expect(PLAN_ORDER).not.toContain("FREE");
  });

  it("only exposes the four real, purchasable plan tiers", () => {
    expect(PLAN_ORDER).toEqual(["BASIC", "PRO", "PLUS", "MAX"]);
  });
});
