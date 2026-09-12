import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn(),
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

vi.mock("@/core/billing/services/membership.service", () => ({
  createPendingMembershipSubscription: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  notifyAllAdmins: vi.fn(),
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";
import { checkRateLimit } from "@vercel/firewall";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/infrastructure/db/client";
import { createClub } from "@/core/clubs/services/clubs.service";
import { createPendingMembershipSubscription } from "@/core/billing/services/membership.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { notifyAllAdmins } from "@/lib/notifications/dispatcher";
import { POST } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const currentUserMock = currentUser as unknown as ReturnType<typeof vi.fn>;
const checkBotIdMock = checkBotId as unknown as ReturnType<typeof vi.fn>;
const checkRateLimitMock = checkRateLimit as unknown as ReturnType<
  typeof vi.fn
>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const upsertMock = prisma.userProfile.upsert as ReturnType<typeof vi.fn>;
const createClubMock = createClub as ReturnType<typeof vi.fn>;
const createPendingMembershipSubscriptionMock =
  createPendingMembershipSubscription as ReturnType<typeof vi.fn>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;
const notifyAllAdminsMock = notifyAllAdmins as ReturnType<typeof vi.fn>;

function ownerBody(overrides: Record<string, unknown> = {}) {
  return {
    userType: "owner",
    name: "Test Club",
    email: "owner@example.com",
    phone: "+541122223333",
    whatsappNumber: "+541122224444",
    legalName: "Test Club S.A.",
    taxId: "30-12345678-9",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
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
    createPendingMembershipSubscriptionMock.mockReset();
    logAuditMock.mockReset();
    notifyAllAdminsMock.mockReset();
    notifyAllAdminsMock.mockResolvedValue(undefined);
    checkBotIdMock.mockReset();
    checkRateLimitMock.mockReset();

    authMock.mockResolvedValue({ userId: "user_1" });
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "owner@example.com" },
      emailAddresses: [],
      imageUrl: null,
    });
    upsertMock.mockResolvedValue({});
    checkBotIdMock.mockResolvedValue({ isBot: false });
    checkRateLimitMock.mockResolvedValue({ rateLimited: false });
  });

  it("returns 403 when BotID classifies the request as a bot", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(403);
    expect(createClubMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the shared rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: true });

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(429);
    expect(createClubMock).not.toHaveBeenCalled();
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
      plan: "BASIC",
    });

    const response = await POST(makeRequest(ownerBody()));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ role: "owner", clubId: "club_1" });

    // Plan/membership tier selection now happens later, in the dashboard's
    // payment-activation gate — every new club is created on BASIC.
    expect(createClubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "BASIC",
        whatsappNumber: "+541122224444",
      }),
      "user_1",
    );

    // The new state-machine row is seeded on top, in PENDING, with no MP
    // object yet.
    expect(createPendingMembershipSubscriptionMock).toHaveBeenCalledWith({
      clubId: "club_1",
      plan: "BASIC",
      currency: "ARS",
    });
  });

  // Admin approval queue gate (see prisma/schema.prisma's
  // Club.approvalStatus and lib/mercadopago/operationalStatus.ts's
  // PENDING_APPROVAL cause). This onboarding call site is the ONLY place in
  // the codebase that ever overrides the schema's own @default(APPROVED) —
  // every other club-touching call site (including the FREE-plan testing
  // bypass and admin approve/reject actions) omits it or sets APPROVED.
  it("owner path: creates the new club with approvalStatus: PENDING, overriding the schema's own @default(APPROVED)", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "BASIC",
    });

    await POST(makeRequest(ownerBody()));

    expect(createClubMock).toHaveBeenCalledWith(
      expect.objectContaining({ approvalStatus: "PENDING" }),
      "user_1",
    );
  });

  it("owner path: broadcasts CLUB_PENDING_APPROVAL to all admins after creating the PENDING club", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "BASIC",
    });

    await POST(makeRequest(ownerBody()));

    expect(notifyAllAdminsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB_PENDING_APPROVAL",
        clubId: "club_1",
        sendEmail: false,
      }),
    );
  });

  it("rejects an owner submission missing whatsappNumber", async () => {
    const body = ownerBody({ whatsappNumber: undefined });
    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(createClubMock).not.toHaveBeenCalled();
  });

  it("player path: does not touch the membership subscription service at all", async () => {
    const response = await POST(makeRequest(playerBody()));

    expect(response.status).toBe(200);
    expect(createClubMock).not.toHaveBeenCalled();
    expect(createPendingMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  // Real shape verified against the actual dev database (Postgres unique
  // violation on "user_profiles_email_key", migration
  // 20260906110000_add_user_profile_email_unique), same convention as
  // core/courts/services/courts.service.test.ts's own P2002 fixture.
  it("returns 409 with a friendly message when the email is already registered under a different account", async () => {
    upsertMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the constraint: `user_profiles_email_key`",
        {
          code: "P2002",
          clientVersion: "7.9.1",
          meta: { modelName: "UserProfile" },
        },
      ),
    );

    const response = await POST(makeRequest(playerBody()));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("A user with this email is already registered.");
  });

  // Real shape verified against the actual dev database (Postgres unique
  // violation on "clubs_email_key", the club-side counterpart migration to
  // 20260906110000_add_user_profile_email_unique) — same fixture convention
  // as the UserProfile.email test above. Positionally distinct from it:
  // createClub runs BEFORE the owner's own UserProfile.upsert, so a P2002
  // thrown from createClub can only ever be the club's email colliding, not
  // the Clerk account's own.
  it("returns 409 with a support-contact message when the club's email is already registered to another club", async () => {
    createClubMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the constraint: `clubs_email_key`",
        {
          code: "P2002",
          clientVersion: "7.9.1",
          meta: { modelName: "Club" },
        },
      ),
    );

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe(
      "This club's email is already registered. Please contact hello@playpadel.com to resolve this.",
    );
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns 500 without upserting the profile when seeding the membership subscription fails", async () => {
    createClubMock.mockResolvedValue({
      id: "club_1",
      name: "Test Club",
      plan: "BASIC",
    });
    createPendingMembershipSubscriptionMock.mockRejectedValue(
      new Error("db unavailable"),
    );

    const response = await POST(makeRequest(ownerBody()));

    expect(response.status).toBe(500);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
