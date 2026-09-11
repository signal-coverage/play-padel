import { describe, expect, it, vi, beforeEach } from "vitest";

// users.service.ts eagerly imports the real Prisma/Neon client at module
// load time (same reason hasAnyFreeSlot.test.ts / getClubsAvailability.test.ts
// need this) — mock it so importing the module for these pure-ish service
// functions doesn't require a real DATABASE_URL.
const { findUniqueMock, updateMock, updateManyMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      findUnique: findUniqueMock,
      update: updateMock,
      updateMany: updateManyMock,
    },
  },
}));

import {
  anonymizeUserProfile,
  syncUserProfileFromClerk,
} from "./users.service";

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user_123",
    role: "player",
    clubId: null,
    displayName: "Jane Doe",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    photoURL: "https://img.example.com/jane.png",
    phone: "+541122334455",
    address: "Some street 123",
    country: "AR",
    province: "Buenos Aires",
    city: "CABA",
    zipCode: "1000",
    gender: null,
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    status: "ACTIVE",
    lastLogin: null,
    acceptedTermsAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: "user_123",
    updatedBy: "user_123",
    ...overrides,
  };
}

describe("anonymizeUserProfile", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    updateManyMock.mockReset();
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  it("scrubs all PII fields and sets status to DELETED", async () => {
    await anonymizeUserProfile("user_123", "system:clerk-webhook");

    expect(updateManyMock).toHaveBeenCalledTimes(1);
    const call = updateManyMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "user_123" });
    expect(call.data).toMatchObject({
      displayName: "Deleted User",
      firstName: null,
      lastName: null,
      photoURL: null,
      phone: null,
      address: null,
      country: null,
      province: null,
      city: null,
      zipCode: null,
      gender: null,
      status: "DELETED",
      updatedBy: "system:clerk-webhook",
    });
  });

  it("sets a distinct placeholder email embedding the uid", async () => {
    await anonymizeUserProfile("user_456", "system:clerk-webhook");

    const call = updateManyMock.mock.calls[0][0];
    expect(call.data.email).toBe("deleted-user_456@play-padel.invalid");
  });

  it("does not touch id, role, clubId, createdAt, or createdBy", async () => {
    await anonymizeUserProfile("user_123", "system:clerk-webhook");

    const call = updateManyMock.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("id");
    expect(call.data).not.toHaveProperty("role");
    expect(call.data).not.toHaveProperty("clubId");
    expect(call.data).not.toHaveProperty("createdAt");
    expect(call.data).not.toHaveProperty("createdBy");
    expect(call.data).not.toHaveProperty("reservations");
  });

  it("returns true when a matching UserProfile row was actually anonymized", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    const result = await anonymizeUserProfile(
      "user_123",
      "system:clerk-webhook",
    );

    expect(result).toBe(true);
  });

  // Uses updateMany (never throwing on a zero-row match, unlike update)
  // specifically so a Clerk user.deleted webhook for a Clerk user who never
  // completed onboarding — no UserProfile row was ever created for them,
  // see app/api/onboarding/route.ts — no-ops instead of crashing the
  // webhook handler with Prisma's "No record was found for an update".
  it("returns false and does not throw when no UserProfile row exists for the uid", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await anonymizeUserProfile(
      "user_ghost",
      "system:clerk-webhook",
    );

    expect(result).toBe(false);
  });
});

describe("syncUserProfileFromClerk", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
  });

  it("only updates the fields actually provided", async () => {
    findUniqueMock.mockResolvedValue(makeRow());
    updateMock.mockResolvedValue(makeRow({ displayName: "New Name" }));

    await syncUserProfileFromClerk("user_123", { displayName: "New Name" });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const call = updateMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "user_123" });
    expect(call.data).toMatchObject({ displayName: "New Name" });
    expect(call.data).not.toHaveProperty("email");
    expect(call.data).not.toHaveProperty("photoURL");
  });

  it("updates multiple provided fields together", async () => {
    findUniqueMock.mockResolvedValue(makeRow());
    updateMock.mockResolvedValue(makeRow());

    await syncUserProfileFromClerk("user_123", {
      email: "new@example.com",
      photoURL: "https://img.example.com/new.png",
    });

    const call = updateMock.mock.calls[0][0];
    expect(call.data).toMatchObject({
      email: "new@example.com",
      photoURL: "https://img.example.com/new.png",
    });
    expect(call.data).not.toHaveProperty("displayName");
  });

  it("is a safe no-op when no UserProfile row exists yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      syncUserProfileFromClerk("user_ghost", { displayName: "Ghost" }),
    ).resolves.not.toThrow();

    expect(updateMock).not.toHaveBeenCalled();
  });
});
