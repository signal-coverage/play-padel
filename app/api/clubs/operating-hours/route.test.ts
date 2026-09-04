import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/clubs/services/operatingHours.service", () => ({
  getClubOperatingHours: vi.fn(),
  setClubOperatingHours: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import {
  getClubOperatingHours,
  setClubOperatingHours,
} from "@/core/clubs/services/operatingHours.service";
import { GET, PUT } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getClubOperatingHoursMock = getClubOperatingHours as ReturnType<
  typeof vi.fn
>;
const setClubOperatingHoursMock = setClubOperatingHours as ReturnType<
  typeof vi.fn
>;

function putRequest(body: unknown) {
  return new Request("http://localhost/api/clubs/operating-hours", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0];
}

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  getClubOperatingHoursMock.mockReset();
  setClubOperatingHoursMock.mockReset();
});

describe("GET /api/clubs/operating-hours", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getClubOperatingHoursMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the caller's own club's operating hours when authorized", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    getClubOperatingHoursMock.mockResolvedValue([
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(getClubOperatingHoursMock).toHaveBeenCalledWith("club_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({
      operatingHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "21:00" }],
    });
  });
});

describe("PUT /api/clubs/operating-hours", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await PUT(putRequest([]));

    expect(response.status).toBe(401);
    expect(setClubOperatingHoursMock).not.toHaveBeenCalled();
  });

  it("accepts an overnight entry whose end time is numerically before its start time (closes after midnight)", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    const entries = [{ dayOfWeek: 1, startTime: "21:00", endTime: "09:00" }];
    setClubOperatingHoursMock.mockResolvedValue(entries);

    const response = await PUT(putRequest(entries));
    const body = await response.json();

    expect(setClubOperatingHoursMock).toHaveBeenCalledWith("club_1", entries);
    expect(response.status).toBe(200);
    expect(body).toEqual({ operatingHours: entries });
  });

  it("returns 400 when start and end time are the same", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });

    const response = await PUT(
      putRequest([{ dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }]),
    );

    expect(response.status).toBe(400);
    expect(setClubOperatingHoursMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the saved entries on success", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
    const entries = [{ dayOfWeek: 1, startTime: "09:00", endTime: "21:00" }];
    setClubOperatingHoursMock.mockResolvedValue(entries);

    const response = await PUT(putRequest(entries));
    const body = await response.json();

    expect(setClubOperatingHoursMock).toHaveBeenCalledWith("club_1", entries);
    expect(response.status).toBe(200);
    expect(body).toEqual({ operatingHours: entries });
  });
});
