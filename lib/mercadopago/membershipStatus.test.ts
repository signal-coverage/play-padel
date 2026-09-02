import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMembershipSubscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  requireMembershipPaid,
  isMembershipStatusPaid,
} from "./membershipStatus";

const findUniqueMock = prisma.clubMembershipSubscription
  .findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findUniqueMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isMembershipStatusPaid (pure)", () => {
  it("is true for ACTIVE", () => {
    expect(isMembershipStatusPaid("ACTIVE")).toBe(true);
  });

  it("is true for TRIALING", () => {
    expect(isMembershipStatusPaid("TRIALING")).toBe(true);
  });

  it("is false for PENDING", () => {
    expect(isMembershipStatusPaid("PENDING")).toBe(false);
  });

  it("is false for PAST_DUE", () => {
    expect(isMembershipStatusPaid("PAST_DUE")).toBe(false);
  });

  it("is false for CANCELLED", () => {
    expect(isMembershipStatusPaid("CANCELLED")).toBe(false);
  });

  it("is false for null (no subscription row at all)", () => {
    expect(isMembershipStatusPaid(null)).toBe(false);
  });
});

// All real-gating scenarios explicitly opt into the flag (see design.md's
// "Migration / Rollout" decision + the dedicated "feature flag rollout
// safety" describe block below for the flag's own default/off behavior).
describe("requireMembershipPaid — with MEMBERSHIP_GATING_ENABLED=true", () => {
  beforeEach(() => {
    vi.stubEnv("MEMBERSHIP_GATING_ENABLED", "true");
  });

  it("returns ok: true with status ACTIVE when the club's subscription is active", async () => {
    findUniqueMock.mockResolvedValue({ status: "ACTIVE" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: true, status: "ACTIVE" });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      select: { status: true },
    });
  });

  it("returns ok: true with status TRIALING when the club is on an authorized trial", async () => {
    findUniqueMock.mockResolvedValue({ status: "TRIALING" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: true, status: "TRIALING" });
  });

  it("returns ok: false with status PAST_DUE when the club's charge failed", async () => {
    findUniqueMock.mockResolvedValue({ status: "PAST_DUE" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: false, status: "PAST_DUE" });
  });

  it("returns ok: false with status null when the club has no membership subscription row yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: false, status: null });
  });
});

/**
 * Rollout safety (design.md's "Migration / Rollout" decision, Phase 10):
 * membership gating is opt-in via `MEMBERSHIP_GATING_ENABLED`. Unset (or any
 * value other than the literal string "true") makes `requireMembershipPaid`
 * a no-op pass-through — `ok: true` unconditionally — so the whole
 * membership feature can ship dark and be flipped on deliberately once
 * verified in production, and flipped back off instantly during an
 * incident with no redeploy ("on instability, `requireMembershipPaid`
 * returns `ok: true` unconditionally").
 */
describe("requireMembershipPaid — feature flag rollout safety", () => {
  it("is a no-op pass-through (ok: true) when MEMBERSHIP_GATING_ENABLED is unset, even for a PAST_DUE club", async () => {
    findUniqueMock.mockResolvedValue({ status: "PAST_DUE" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: true, status: "PAST_DUE" });
  });

  it("is a no-op pass-through (ok: true) when MEMBERSHIP_GATING_ENABLED is unset, even with no subscription row at all", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: true, status: null });
  });

  it("is a no-op pass-through (ok: true) when MEMBERSHIP_GATING_ENABLED is explicitly set to a non-'true' value", async () => {
    vi.stubEnv("MEMBERSHIP_GATING_ENABLED", "false");
    findUniqueMock.mockResolvedValue({ status: "CANCELLED" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: true, status: "CANCELLED" });
  });

  it("enforces real gating once MEMBERSHIP_GATING_ENABLED is explicitly 'true'", async () => {
    vi.stubEnv("MEMBERSHIP_GATING_ENABLED", "true");
    findUniqueMock.mockResolvedValue({ status: "CANCELLED" });

    const result = await requireMembershipPaid("club_1");

    expect(result).toEqual({ ok: false, status: "CANCELLED" });
  });
});
