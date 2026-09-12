import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservationPartners.service", () => ({
  getLatestPartnerForPlayer: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { getLatestPartnerForPlayer } from "@/core/reservations/services/reservationPartners.service";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const getLatestPartnerForPlayerMock = getLatestPartnerForPlayer as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  authMock.mockReset();
  getLatestPartnerForPlayerMock.mockReset();
});

describe("GET /api/player/latest-partner", () => {
  it("returns 401 when the caller is not signed in", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getLatestPartnerForPlayerMock).not.toHaveBeenCalled();
  });

  it("returns the derived partner for the signed-in caller", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    getLatestPartnerForPlayerMock.mockResolvedValue({
      id: "partner_1",
      name: "Sofía Martínez",
      avatarUrl: null,
      padelCategory: 3,
      preferredSide: "backhand",
      dominantHand: "right",
      email: "sofia@example.com",
      phone: null,
      timesPlayedTogether: 5,
      lastPlayedLabel: "3 days ago",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.partner.id).toBe("partner_1");
    expect(getLatestPartnerForPlayerMock).toHaveBeenCalledWith("user_1");
  });

  it("returns { partner: null } when the player has no partner history", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    getLatestPartnerForPlayerMock.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.partner).toBeNull();
  });
});
