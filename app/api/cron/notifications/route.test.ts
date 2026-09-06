import { describe, it, expect, vi, beforeEach } from "vitest";

const { logSystemJobMock } = vi.hoisted(() => ({
  logSystemJobMock: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  getPendingReservationReminders: vi.fn(),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html></html>"),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: logSystemJobMock,
}));

import { getPendingReservationReminders } from "@/core/notifications/services/notifications.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { GET } from "./route";

const getPendingReservationRemindersMock =
  getPendingReservationReminders as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;

const VALID_SECRET = "valid-secret-value";

function makeRequest(authHeader?: string) {
  return new Request("https://app.example.com/api/cron/notifications", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", VALID_SECRET);
  getPendingReservationRemindersMock.mockReset();
  dispatchMock.mockReset();
  logSystemJobMock.mockReset();
  getPendingReservationRemindersMock.mockResolvedValue([]);
});

describe("GET /api/cron/notifications — auth", () => {
  it("rejects requests without the correct CRON_SECRET bearer token", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(getPendingReservationRemindersMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });

  it("does not log a job entry for an unauthorized probe", async () => {
    await GET(makeRequest("Bearer wrong-secret"));

    expect(logSystemJobMock).not.toHaveBeenCalled();
  });

  it("returns 500 (not a silent 401) and logs a FAILURE system job when CRON_SECRET itself is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(makeRequest("Bearer anything"));

    expect(response.status).toBe(500);
    expect(getPendingReservationRemindersMock).not.toHaveBeenCalled();
    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "notifications",
        status: "FAILURE",
        errorMessage: expect.stringContaining("CRON_SECRET"),
      }),
    );
  });
});

describe("GET /api/cron/notifications — existing behavior", () => {
  it("returns the checked count as before", async () => {
    getPendingReservationRemindersMock.mockResolvedValue([
      {
        reservationId: "res_1",
        clubId: "club_1",
        userId: "user_1",
        userEmail: "user@example.com",
        userName: "User One",
        scheduledStart: new Date("2026-09-05T10:00:00Z"),
        courtName: "Court 1",
      },
    ]);

    const response = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ checked: 1 });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/cron/notifications — system job logging", () => {
  it("logs a SUCCESS entry for a successful run", async () => {
    getPendingReservationRemindersMock.mockResolvedValue([]);

    await GET(makeRequest(`Bearer ${VALID_SECRET}`));

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
      }),
    );
  });

  it("logs a FAILURE entry with the error message and still lets the error propagate", async () => {
    getPendingReservationRemindersMock.mockRejectedValue(
      new Error("db unavailable"),
    );

    await expect(GET(makeRequest(`Bearer ${VALID_SECRET}`))).rejects.toThrow(
      "db unavailable",
    );

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CRON",
        name: "notifications",
        status: "FAILURE",
        errorMessage: "db unavailable",
      }),
    );
  });
});
