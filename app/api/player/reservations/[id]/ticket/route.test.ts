import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  listReservationsByUser: vi.fn(),
  getTicketData: vi.fn(),
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
}));

vi.mock("@/lib/pdf/TicketDocument", () => ({
  TicketDocument: () => null,
}));

import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  getTicketData,
} from "@/core/reservations/services/reservations.service";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listReservationsByUserMock = listReservationsByUser as ReturnType<
  typeof vi.fn
>;
const getTicketDataMock = getTicketData as ReturnType<typeof vi.fn>;

const RESERVATION = {
  id: "res_1",
  clubId: "club_1",
  courtName: "Court 1",
  status: "CONFIRMED",
};

const TICKET_DATA = {
  id: "res_1",
  clubName: "Padel Club",
  courtName: "Court 1",
  scheduledStart: new Date("2026-09-01T18:00:00"),
  scheduledEnd: new Date("2026-09-01T19:00:00"),
  userName: "Alex",
  status: "CONFIRMED",
};

function makeRequest(reservationId: string, query = "") {
  return {
    request: new NextRequest(
      `http://localhost/api/player/reservations/${reservationId}/ticket${query}`,
    ),
    params: Promise.resolve({ id: reservationId }),
  };
}

beforeEach(() => {
  authMock.mockReset();
  listReservationsByUserMock.mockReset();
  getTicketDataMock.mockReset();
});

describe("GET /api/player/reservations/[id]/ticket", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const { request, params } = makeRequest("res_1");
    const response = await GET(request, { params });

    expect(response.status).toBe(401);
  });

  it("returns 404 for a reservation that doesn't belong to the caller", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([]); // no reservations owned

    const { request, params } = makeRequest("someone_elses_res");
    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    expect(getTicketDataMock).not.toHaveBeenCalled();
  });

  it("returns 404 with a clear message for a non-confirmed reservation", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([RESERVATION]);
    getTicketDataMock.mockResolvedValue(null);

    const { request, params } = makeRequest("res_1");
    const response = await GET(request, { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/isn't confirmed yet/i);
  });

  it("returns 200 with an attachment Content-Disposition by default", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([RESERVATION]);
    getTicketDataMock.mockResolvedValue(TICKET_DATA);

    const { request, params } = makeRequest("res_1");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment/);
  });

  it("returns 200 with an inline Content-Disposition when ?preview=1 is passed", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([RESERVATION]);
    getTicketDataMock.mockResolvedValue(TICKET_DATA);

    const { request, params } = makeRequest("res_1", "?preview=1");
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline/);
  });
});
