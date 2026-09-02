import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  listCourtsByClub: vi.fn(),
  getCourtSlots: vi.fn(),
}));

vi.mock("@/core/waitlist/services/waitlist.service", () => ({
  hasActiveWaitlistEntry: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import {
  listCourtsByClub,
  getCourtSlots,
} from "@/core/courts/services/courts.service";
import { hasActiveWaitlistEntry } from "@/core/waitlist/services/waitlist.service";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listCourtsByClubMock = listCourtsByClub as ReturnType<typeof vi.fn>;
const getCourtSlotsMock = getCourtSlots as ReturnType<typeof vi.fn>;
const hasActiveWaitlistEntryMock = hasActiveWaitlistEntry as ReturnType<
  typeof vi.fn
>;

function makeRequest(clubId: string, date = "2026-08-20") {
  return {
    request: new NextRequest(
      `http://localhost/api/player/clubs/${clubId}/availability?date=${date}`,
    ),
    params: Promise.resolve({ clubId }),
  };
}

describe("GET /api/player/clubs/[clubId]/availability", () => {
  beforeEach(() => {
    authMock.mockReset();
    listCourtsByClubMock.mockReset();
    getCourtSlotsMock.mockReset();
    hasActiveWaitlistEntryMock.mockReset();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  it("requests courts with operationalOnly: true, scoped to the requested clubId — closes the direct deep-link gap since this route has no separate operational check of its own", async () => {
    listCourtsByClubMock.mockResolvedValue([]);

    const { request, params } = makeRequest("club_operational");
    await GET(request, { params });

    expect(listCourtsByClubMock).toHaveBeenCalledWith("club_operational", {
      operationalOnly: true,
    });
  });

  it("returns an empty courts list for a non-operational club instead of exposing bookable slots", async () => {
    // Simulates listCourtsByClub's query-level CLUB_OPERATIONAL_WHERE filter
    // returning nothing for a non-operational club.
    listCourtsByClubMock.mockResolvedValue([]);

    const { request, params } = makeRequest("club_non_operational");
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ courts: [] });
    expect(getCourtSlotsMock).not.toHaveBeenCalled();
  });

  it("returns normal courts-with-slots for an operational club (existing behavior unaffected)", async () => {
    listCourtsByClubMock.mockResolvedValue([
      {
        id: "court_1",
        name: "Court 1",
        reservationFee: 100,
        surface: "clay",
        color: "#fff",
        indoor: false,
        photoUrl: null,
        courtPrice: 500,
        slotDurationMinutes: 60,
      },
    ]);
    getCourtSlotsMock.mockResolvedValue([
      { start: new Date(), end: new Date(), status: "free" },
    ]);

    const { request, params } = makeRequest("club_operational");
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.courts).toHaveLength(1);
    expect(body.courts[0].id).toBe("court_1");
    expect(body.courts[0].slots).toHaveLength(1);
    expect(hasActiveWaitlistEntryMock).not.toHaveBeenCalled();
  });
});
