import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findUnique: vi.fn(), count: vi.fn() },
    club: { count: vi.fn() },
    court: { count: vi.fn() },
    reservation: { count: vi.fn() },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { auth } from "@clerk/nextjs/server";
import { GET } from "./route";

const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const userProfileCountMock = prisma.userProfile.count as ReturnType<
  typeof vi.fn
>;
const clubCountMock = prisma.club.count as ReturnType<typeof vi.fn>;
const courtCountMock = prisma.court.count as ReturnType<typeof vi.fn>;
const reservationCountMock = prisma.reservation.count as ReturnType<
  typeof vi.fn
>;
const authMock = auth as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findUniqueMock.mockReset();
  userProfileCountMock.mockReset();
  clubCountMock.mockReset();
  courtCountMock.mockReset();
  reservationCountMock.mockReset();
  authMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_admin" });
  findUniqueMock.mockResolvedValue({ isAdmin: true });
});

describe("GET /api/admin/metrics", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(clubCountMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but the caller's UserProfile.isAdmin is not true", async () => {
    findUniqueMock.mockResolvedValue({ isAdmin: false });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user_admin" },
      select: { isAdmin: true, displayName: true },
    });
    expect(clubCountMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller has no UserProfile row at all", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(clubCountMock).not.toHaveBeenCalled();
  });

  it("returns unscoped counts for clubs, courts, players, and booked reservations when authorized", async () => {
    // 12 clubs total; 1 pending approval, 8 genuinely active (approved +
    // status ACTIVE) — the remaining 3 (rejected, suspended, deactivated,
    // whatever) fall out of the inactiveClubs subtraction below without
    // needing their own query.
    clubCountMock
      .mockResolvedValueOnce(12) // unfiltered total
      .mockResolvedValueOnce(1) // approvalStatus: PENDING
      .mockResolvedValueOnce(8); // approvalStatus: APPROVED, status: ACTIVE
    courtCountMock.mockResolvedValue(42);
    userProfileCountMock.mockResolvedValue(120);
    reservationCountMock.mockResolvedValue(730);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // Unfiltered — activeClubs/inactiveClubs/pendingApprovalClubs are a
    // mutually exclusive partition of this same total, not a separately
    // (possibly smaller) filtered count. See PENDING/ACTIVE below for why a
    // club deactivated after its owner's account was deleted (see
    // app/api/webhooks/clerk/route.ts) or rejected during approval must not
    // silently keep counting as active.
    expect(clubCountMock).toHaveBeenNthCalledWith(1);
    expect(clubCountMock).toHaveBeenNthCalledWith(2, {
      where: { approvalStatus: "PENDING" },
    });
    expect(clubCountMock).toHaveBeenNthCalledWith(3, {
      where: { approvalStatus: "APPROVED", status: "ACTIVE" },
    });
    expect(courtCountMock).toHaveBeenCalledWith();
    expect(userProfileCountMock).toHaveBeenCalledWith({
      where: { role: "player" },
    });
    expect(reservationCountMock).toHaveBeenCalledWith({
      where: { status: { in: ["SCHEDULED", "CONFIRMED"] } },
    });
    expect(body).toEqual({
      metrics: {
        totalClubs: 12,
        activeClubs: 8,
        // Derived: 12 - 1 (pending) - 8 (active) = 3, not a 4th query.
        inactiveClubs: 3,
        pendingApprovalClubs: 1,
        totalCourts: 42,
        totalPlayers: 120,
        totalReservations: 730,
      },
    });
  });
});
