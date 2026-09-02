import { describe, it, expect } from "vitest";
import { hasCompletedOnboarding } from "./utils";

describe("hasCompletedOnboarding", () => {
  it("is false for no profile at all", () => {
    expect(hasCompletedOnboarding(null)).toBe(false);
    expect(hasCompletedOnboarding(undefined)).toBe(false);
  });

  it("is false when role is not set yet", () => {
    expect(hasCompletedOnboarding({ role: null, clubId: null })).toBe(false);
  });

  it("is true for a player, regardless of clubId (players never have one)", () => {
    expect(hasCompletedOnboarding({ role: "player", clubId: null })).toBe(true);
  });

  // The exact regression this function exists to prevent: an owner who
  // picked "I'm a club owner" but never finished creating their club is
  // NOT done — verified this is the case a real Google-sign-in got stuck
  // bouncing between /dashboard and /onboarding on, before the two pages'
  // own separate checks were unified into this one function.
  it("is false for an owner with no club yet", () => {
    expect(hasCompletedOnboarding({ role: "owner", clubId: null })).toBe(false);
  });

  it("is true for an owner with a club", () => {
    expect(hasCompletedOnboarding({ role: "owner", clubId: "club_1" })).toBe(
      true,
    );
  });
});
