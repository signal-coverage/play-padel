import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mercadopago/operationalStatus", () => ({
  getClubOperationalStatus: vi.fn(),
}));

import { getClubOperationalStatus } from "@/lib/mercadopago/operationalStatus";
import { requireClubOperational } from "./require-club-operational";

const getClubOperationalStatusMock = getClubOperationalStatus as ReturnType<
  typeof vi.fn
>;

describe("requireClubOperational", () => {
  beforeEach(() => {
    getClubOperationalStatusMock.mockReset();
  });

  it("returns ok: true when the club is operational", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });

    const result = await requireClubOperational("club_1");

    expect(result).toEqual({ ok: true });
  });

  it("returns a 403 club_mp_not_connected response when MP is not connected", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "MP_NOT_CONNECTED",
    });

    const result = await requireClubOperational("club_1");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok: false");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "club_mp_not_connected",
    });
  });

  it("returns a 403 club_inactive response when the club status is not ACTIVE", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "CLUB_INACTIVE",
    });

    const result = await requireClubOperational("club_1");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok: false");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      error: "club_inactive",
    });
  });
});
