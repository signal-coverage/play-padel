import { describe, it, expect, vi, beforeEach } from "vitest";

// clubs.service.ts eagerly imports the real Prisma client at module load —
// mock it so importing the module doesn't require a real DATABASE_URL (same
// pattern as core/courts/services/getClubsAvailability.test.ts).
const {
  findManyMock,
  findFirstMock,
  createMock,
  findUniqueMock,
  updateMock,
  userProfileFindManyMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  userProfileFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: {
      findMany: findManyMock,
      create: createMock,
      findUnique: findUniqueMock,
      update: updateMock,
    },
    userProfile: {
      findFirst: findFirstMock,
      findMany: userProfileFindManyMock,
    },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

const { dispatchMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: dispatchMock,
}));

import {
  createClub,
  listActiveClubs,
  listAllClubs,
  listPendingClubs,
  approveClub,
  rejectClub,
  getClubOwner,
  MP_TOKEN_EXPIRY_WARNING_DAYS,
} from "./clubs.service";
import { CLUB_OPERATIONAL_WHERE } from "@/lib/mercadopago/operationalStatus";

function makeClubRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "club_1",
    name: "Operational Club",
    legalName: null,
    taxId: null,
    email: "club@example.com",
    phone: null,
    address: null,
    country: null,
    province: null,
    city: null,
    zipCode: null,
    logoUrl: null,
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    plan: "BASIC",
    status: "ACTIVE",
    requiresPrepayment: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "user_1",
    updatedBy: "user_1",
    ...overrides,
  };
}

describe("createClub", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue(makeClubRow());
  });

  it("omits approvalStatus entirely when not provided, so the schema's own @default(APPROVED) applies", async () => {
    await createClub(
      {
        name: "Test Club",
        email: "club@example.com",
        timezone: "America/Argentina/Buenos_Aires",
        currency: "ARS",
      },
      "user_1",
    );

    const dataArg = createMock.mock.calls[0][0].data;
    expect(dataArg).not.toHaveProperty("approvalStatus");
  });

  // Onboarding's own club-creation call site is the ONLY caller that ever
  // passes this — see app/api/onboarding/route.ts and this change's
  // migration-safety requirement (schema default stays APPROVED).
  it("passes approvalStatus through explicitly when provided (onboarding's PENDING override)", async () => {
    await createClub(
      {
        name: "Test Club",
        email: "club@example.com",
        timezone: "America/Argentina/Buenos_Aires",
        currency: "ARS",
        approvalStatus: "PENDING",
      },
      "user_1",
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvalStatus: "PENDING" }),
      }),
    );
  });
});

describe("listPendingClubs (admin approval queue)", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("queries clubs with approvalStatus PENDING, ordered oldest-first, selecting only the review-relevant fields", async () => {
    const createdAt = new Date("2026-09-01T00:00:00Z");
    findManyMock.mockResolvedValue([
      {
        id: "club_1",
        name: "Pending Club",
        email: "club@example.com",
        createdAt,
      },
    ]);

    const result = await listPendingClubs();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { approvalStatus: "PENDING" },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    expect(result).toEqual([
      {
        id: "club_1",
        name: "Pending Club",
        email: "club@example.com",
        createdAt,
      },
    ]);
  });
});

describe("approveClub (admin approval queue action)", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    findFirstMock.mockReset();
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue(undefined);
  });

  it("returns not_found when the club doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await approveClub("club_ghost");

    expect(result).toEqual({ status: "not_found" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not_pending when the club is not currently PENDING (e.g. already APPROVED)", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "APPROVED" });

    const result = await approveClub("club_1");

    expect(result).toEqual({ status: "not_pending" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets approvalStatus to APPROVED for a PENDING club", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "APPROVED" });
    findFirstMock.mockResolvedValue(null);

    const result = await approveClub("club_1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { approvalStatus: "APPROVED" },
    });
    expect(result).toEqual({ status: "ok", clubId: "club_1" });
  });

  it("dispatches a CLUB_APPROVED in-app notification to the club owner after a successful approval", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "APPROVED" });
    findFirstMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
      photoURL: null,
      email: "owner@example.com",
    });

    await approveClub("club_1");

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB_APPROVED",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        recipientName: "Owner Person",
        sendEmail: false,
      }),
    );
  });

  it("still succeeds and returns ok even when the club has no owner row (no dispatch, no throw)", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "APPROVED" });
    findFirstMock.mockResolvedValue(null);

    const result = await approveClub("club_1");

    expect(result).toEqual({ status: "ok", clubId: "club_1" });
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

describe("rejectClub (admin approval queue action)", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    findFirstMock.mockReset();
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue(undefined);
  });

  it("returns not_found when the club doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await rejectClub("club_ghost");

    expect(result).toEqual({ status: "not_found" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not_pending when the club is not currently PENDING", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "REJECTED" });

    const result = await rejectClub("club_1");

    expect(result).toEqual({ status: "not_pending" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets approvalStatus to REJECTED for a PENDING club", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "REJECTED" });
    findFirstMock.mockResolvedValue(null);

    const result = await rejectClub("club_1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { approvalStatus: "REJECTED" },
    });
    expect(result).toEqual({ status: "ok", clubId: "club_1" });
  });

  it("dispatches a CLUB_REJECTED in-app notification to the club owner after a successful rejection", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "REJECTED" });
    findFirstMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
      photoURL: null,
      email: "owner@example.com",
    });

    await rejectClub("club_1");

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB_REJECTED",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        recipientName: "Owner Person",
        sendEmail: false,
      }),
    );
  });

  it("still succeeds and returns ok even when the club has no owner row (no dispatch, no throw)", async () => {
    findUniqueMock.mockResolvedValue({ approvalStatus: "PENDING" });
    updateMock.mockResolvedValue({ id: "club_1", approvalStatus: "REJECTED" });
    findFirstMock.mockResolvedValue(null);

    const result = await rejectClub("club_1");

    expect(result).toEqual({ status: "ok", clubId: "club_1" });
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

describe("listActiveClubs", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    userProfileFindManyMock.mockReset();
    userProfileFindManyMock.mockResolvedValue([]);
  });

  it("queries with CLUB_OPERATIONAL_WHERE (ACTIVE status merged with CONNECTED MP account), not a bare ACTIVE-only filter", async () => {
    findManyMock.mockResolvedValue([]);

    await listActiveClubs();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: CLUB_OPERATIONAL_WHERE }),
    );
  });

  it("does not duplicate the ACTIVE condition alongside CLUB_OPERATIONAL_WHERE", async () => {
    findManyMock.mockResolvedValue([]);

    await listActiveClubs();

    const callArgs = findManyMock.mock.calls[0][0];
    // Only one `status` key should exist in the composed where clause.
    expect(Object.keys(callArgs.where).filter((k) => k === "status")).toEqual([
      "status",
    ]);
    expect(callArgs.where.status).toBe("ACTIVE");
  });

  it("maps through whatever rows the query-level filter returns (a non-operational club is expected to never appear here)", async () => {
    findManyMock.mockResolvedValue([makeClubRow()]);

    const clubs = await listActiveClubs();

    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe("club_1");
  });

  // A club never has its own independently-editable logo — the "club photo"
  // shown everywhere is always the owner's own Clerk-synced profile photo.
  // This must be attached via a SINGLE batched userProfile.findMany query,
  // never a per-club lookup in a loop (this exact N+1 pattern was previously
  // found and fixed for this same function's caller).
  it("attaches each club's ownerPhotoUrl via ONE batched userProfile.findMany query, regardless of how many clubs are returned", async () => {
    findManyMock.mockResolvedValue([
      makeClubRow({ id: "club_1" }),
      makeClubRow({ id: "club_2" }),
      makeClubRow({ id: "club_3" }),
    ]);
    userProfileFindManyMock.mockResolvedValue([
      { clubId: "club_1", photoURL: "https://img.example/1.png" },
      { clubId: "club_3", photoURL: "https://img.example/3.png" },
    ]);

    const clubs = await listActiveClubs();

    expect(userProfileFindManyMock).toHaveBeenCalledTimes(1);
    expect(userProfileFindManyMock).toHaveBeenCalledWith({
      where: { clubId: { in: ["club_1", "club_2", "club_3"] }, role: "owner" },
      select: { clubId: true, photoURL: true },
    });
    expect(clubs.find((c) => c.id === "club_1")?.ownerPhotoUrl).toBe(
      "https://img.example/1.png",
    );
    expect(clubs.find((c) => c.id === "club_2")?.ownerPhotoUrl ?? null).toBe(
      null,
    );
    expect(clubs.find((c) => c.id === "club_3")?.ownerPhotoUrl).toBe(
      "https://img.example/3.png",
    );
  });

  it("makes no batched owner-photo query at all when there are no clubs to attach owners to", async () => {
    findManyMock.mockResolvedValue([]);

    await listActiveClubs();

    expect(userProfileFindManyMock).not.toHaveBeenCalled();
  });
});

describe("listAllClubs", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  function makeAdminRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "club_1",
      name: "Club Padel Norte",
      status: "ACTIVE",
      plan: "PRO",
      mercadoPagoAccount: {
        status: "CONNECTED",
        tokenExpiresAt: daysFromNow(30),
      },
      membershipSubscription: { status: "ACTIVE" },
      _count: { operatingHours: 3 },
      ...overrides,
    };
  }

  it("queries every club, unfiltered, ordered by name, including MP account/membership/operating-hours count in a single round-trip", async () => {
    findManyMock.mockResolvedValue([]);

    await listAllClubs();

    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        plan: true,
        mercadoPagoAccount: { select: { status: true, tokenExpiresAt: true } },
        membershipSubscription: { select: { status: true } },
        _count: { select: { operatingHours: true } },
      },
    });
  });

  it("maps a fully healthy club to all-false health flags", async () => {
    findManyMock.mockResolvedValue([makeAdminRow()]);

    const clubs = await listAllClubs();

    expect(clubs).toEqual([
      {
        id: "club_1",
        name: "Club Padel Norte",
        status: "ACTIVE",
        plan: "PRO",
        mpTokenIssue: false,
        membershipPastDue: false,
        noOperatingHours: false,
      },
    ]);
  });

  it("flags mpTokenIssue when there is no Mercado Pago account at all", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({ mercadoPagoAccount: null }),
    ]);

    const [club] = await listAllClubs();

    expect(club.mpTokenIssue).toBe(true);
  });

  it("flags mpTokenIssue when the Mercado Pago account is not CONNECTED", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({
        mercadoPagoAccount: {
          status: "NOT_CONNECTED",
          tokenExpiresAt: daysFromNow(30),
        },
      }),
    ]);

    const [club] = await listAllClubs();

    expect(club.mpTokenIssue).toBe(true);
  });

  it("flags mpTokenIssue when the token already expired", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({
        mercadoPagoAccount: {
          status: "CONNECTED",
          tokenExpiresAt: daysFromNow(-1),
        },
      }),
    ]);

    const [club] = await listAllClubs();

    expect(club.mpTokenIssue).toBe(true);
  });

  it(`flags mpTokenIssue when the token expires within the ${MP_TOKEN_EXPIRY_WARNING_DAYS}-day warning window`, async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({
        mercadoPagoAccount: {
          status: "CONNECTED",
          tokenExpiresAt: daysFromNow(MP_TOKEN_EXPIRY_WARNING_DAYS - 1),
        },
      }),
    ]);

    const [club] = await listAllClubs();

    expect(club.mpTokenIssue).toBe(true);
  });

  it("does not flag mpTokenIssue when the token expires safely beyond the warning window", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({
        mercadoPagoAccount: {
          status: "CONNECTED",
          tokenExpiresAt: daysFromNow(MP_TOKEN_EXPIRY_WARNING_DAYS + 30),
        },
      }),
    ]);

    const [club] = await listAllClubs();

    expect(club.mpTokenIssue).toBe(false);
  });

  it("flags membershipPastDue when the membership subscription is PAST_DUE", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({ membershipSubscription: { status: "PAST_DUE" } }),
    ]);

    const [club] = await listAllClubs();

    expect(club.membershipPastDue).toBe(true);
  });

  it("does not flag membershipPastDue when there is no membership subscription at all", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({ membershipSubscription: null }),
    ]);

    const [club] = await listAllClubs();

    expect(club.membershipPastDue).toBe(false);
  });

  it("flags noOperatingHours when the club has zero configured operating-hours rows", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({ _count: { operatingHours: 0 } }),
    ]);

    const [club] = await listAllClubs();

    expect(club.noOperatingHours).toBe(true);
  });

  it("does not flag noOperatingHours when the club has configured hours", async () => {
    findManyMock.mockResolvedValue([
      makeAdminRow({ _count: { operatingHours: 5 } }),
    ]);

    const [club] = await listAllClubs();

    expect(club.noOperatingHours).toBe(false);
  });
});

// Used by GET /api/admin/clubs/[clubId] to surface the owner's userId to
// AdminClubSettingsView's "Impersonate owner" button — no prior helper for
// this lookup existed anywhere in the codebase.
describe("getClubOwner", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("queries UserProfile for the owner-role row scoped to the given clubId, also selecting photoURL and email", async () => {
    findFirstMock.mockResolvedValue(null);

    await getClubOwner("club_1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { clubId: "club_1", role: "owner" },
      select: { id: true, displayName: true, photoURL: true, email: true },
    });
  });

  it("returns the owner's id, displayName, photoURL and email when found", async () => {
    findFirstMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
      photoURL: "https://img.example/owner.png",
      email: "owner@example.com",
    });

    const owner = await getClubOwner("club_1");

    expect(owner).toEqual({
      id: "user_owner",
      displayName: "Owner Person",
      photoURL: "https://img.example/owner.png",
      email: "owner@example.com",
    });
  });

  it("returns null when the club has no owner row", async () => {
    findFirstMock.mockResolvedValue(null);

    const owner = await getClubOwner("club_1");

    expect(owner).toBeNull();
  });
});
