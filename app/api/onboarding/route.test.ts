import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  createClub: vi.fn(),
}));

vi.mock("@/core/clubs/services/operatingHours.service", () => ({
  setClubOperatingHours: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  createPendingMembershipSubscription: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { createClub } from "@/core/clubs/services/clubs.service";
import { setClubOperatingHours } from "@/core/clubs/services/operatingHours.service";
import { createPendingMembershipSubscription } from "@/core/billing/services/membership.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { POST } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const currentUserMock = currentUser as unknown as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const upsertMock = prisma.userProfile.upsert as ReturnType<typeof vi.fn>;
const createClubMock = createClub as ReturnType<typeof vi.fn>;
const setClubOperatingHoursMock = setClubOperatingHours as ReturnType<
  typeof vi.fn
>;
const createPendingMembershipSubscriptionMock =
  createPendingMembershipSubscription as ReturnType<typeof vi.fn>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

const DEFAULT_OWNER_OPERATING_HOURS = [
  { dayOfWeek: 1, active: true, startTime: "09:00", endTime: "21:00" },
  { dayOfWeek: 2, active: true, startTime: "09:00", endTime: "21:00" },
  { dayOfWeek: 3, active: false, startTime: "09:00", endTime: "21:00" },
];

function ownerBody(overrides: Record<string, unknown> = {}) {
  return {
    userType: "owner",
    name: "Test Club",
    email: "owner@example.com",
    phone: "+541122223333",
    legalName: "Test Club S.A.",
    taxId: "30-12345678-9",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    courtRange: "3-4",
    operatingHours: DEFAULT_OWNER_OPERATING_HOURS,
    address: "Main St 123",
    displayName: "Owner Name",
    confirmedAge: true,
    acceptedTerms: true,
    ...overrides,
  };
}

function playerBody(overrides: Record<string, unknown> = {}) {
  return {
    userType: "player",
    firstName: "Jane",
    lastName: "Doe",
    email: "player@example.com",
    phone: "+541122223333",
    gender: "FEMALE",
    confirmedAge: true,
    acceptedTerms: true,
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    authMock.mockReset();
    currentUserMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    createClubMock.mockReset();
    setClubOperatingHoursMock.mockReset();
    createPendingMembershipSubscriptionMock.mockReset();
    logAuditMock.mockReset();

    authMock.mockResolvedValue({ userId: "user_1" });
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "owner@example.com" },
      emailAddresses: [],
      imageUrl: null,
    });
    upsertMock.mockResolvedValue({});
  });

  it("returns 401 when there is no authenticated user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(401);
    expect(createClubMock).not.toHaveBeenCalled();
    expect(createPendingMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("owner path: creates the club, then seeds a PENDING ClubMembershipSubscription for it (no MP object yet)", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "PRO",
    });

    const response = await POST(makeRequest(ownerBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ role: "owner", clubId: "club_1" });

    // Club.plan is still written directly by createClub (needed for court
    // capacity immediately) — see design's Onboarding flow.
    expect(createClubMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "PRO" }),
      "user_1",
    );

    // The new state-machine row is seeded on top, in PENDING, with no MP
    // object yet.
    expect(createPendingMembershipSubscriptionMock).toHaveBeenCalledWith({
      clubId: "club_1",
      plan: "PRO",
      currency: "ARS",
    });
  });

  it("owner path: seeds the club's operating hours from the filtered/mapped active days", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "PRO",
    });

    await POST(makeRequest(ownerBody()));

    expect(setClubOperatingHoursMock).toHaveBeenCalledWith("club_1", [
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "21:00" },
    ]);
  });

  // A defensive-only branch: onboardingFormSchema's superRefine already
  // requires >=1 active operatingHours entry for any owner payload that
  // passes validation (see app/onboarding/types.ts), so a real request can
  // never reach the route with an empty/missing operatingHours — confirmed
  // here by the 400 rather than a 200, since parsing fails before this
  // route's own club-creation logic ever runs.
  it("owner path: rejects with 400 before ever creating a club when operatingHours has no active day (schema-enforced)", async () => {
    const response = await POST(makeRequest(ownerBody({ operatingHours: [] })));

    expect(response.status).toBe(400);
    expect(createClubMock).not.toHaveBeenCalled();
    expect(setClubOperatingHoursMock).not.toHaveBeenCalled();
  });

  it("player path: does not touch the membership subscription service at all", async () => {
    const response = await POST(makeRequest(playerBody()));

    expect(response.status).toBe(200);
    expect(createClubMock).not.toHaveBeenCalled();
    expect(createPendingMembershipSubscriptionMock).not.toHaveBeenCalled();
    expect(setClubOperatingHoursMock).not.toHaveBeenCalled();
  });

  it("returns 500 without upserting the profile when seeding the membership subscription fails", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "PRO",
    });
    createPendingMembershipSubscriptionMock.mockRejectedValue(
      new Error("db unavailable"),
    );

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(500);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
