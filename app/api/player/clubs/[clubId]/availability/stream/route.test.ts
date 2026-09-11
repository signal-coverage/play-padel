import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  listReservationsByClub: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { listReservationsByClub } from "@/core/reservations/services/reservations.service";
import { GET, POLL_INTERVAL_MS, HEARTBEAT_INTERVAL_MS } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listMock = listReservationsByClub as ReturnType<typeof vi.fn>;

function makeReservation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    status: "SCHEDULED",
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides,
  };
}

function makeRequest(date: string | null, signal?: AbortSignal) {
  const url = date
    ? `http://localhost/api/player/clubs/club_1/availability/stream?date=${date}`
    : "http://localhost/api/player/clubs/club_1/availability/stream";
  return new Request(url, { signal });
}

function makeParams(clubId = "club_1") {
  return { params: Promise.resolve({ clubId }) };
}

// Same fake-timer race as app/api/notifications/stream/route.test.ts.
async function readAvailable(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const timedOut = vi.advanceTimersByTimeAsync(10).then(() => ({
      done: true as const,
      value: undefined,
      timedOut: true as const,
    }));
    const read = reader
      .read()
      .then((r) => ({ ...r, timedOut: false as const }));
    const result = await Promise.race([read, timedOut]);
    if (result.timedOut || result.done || !result.value) break;
    text += decoder.decode(result.value);
  }
  return text;
}

describe("GET /api/player/clubs/[clubId]/availability/stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMock.mockReset();
    listMock.mockReset();
    authMock.mockResolvedValue({ userId: "user_1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when there is no signed-in Clerk user, without ever polling", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET(makeRequest("2026-09-10"), makeParams());

    expect(response.status).toBe(401);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the date query param is missing or malformed, without ever polling", async () => {
    const missing = await GET(makeRequest(null), makeParams());
    expect(missing.status).toBe(400);

    const malformed = await GET(makeRequest("not-a-date"), makeParams());
    expect(malformed.status).toBe(400);

    expect(listMock).not.toHaveBeenCalled();
  });

  it("streams as text/event-stream and does not emit a changed event for the initial poll (it's just the baseline)", async () => {
    listMock.mockResolvedValue([makeReservation()]);
    const controller = new AbortController();

    const response = await GET(
      makeRequest("2026-09-10", controller.signal),
      makeParams(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();
    const text = await readAvailable(reader);
    expect(text).not.toContain("event: changed");
    expect(listMock).toHaveBeenCalledWith(
      "club_1",
      expect.objectContaining({ date: expect.any(Date) }),
    );

    controller.abort();
    await reader.cancel();
  });

  it("emits a changed event once availability for that club/date actually changes", async () => {
    listMock.mockResolvedValueOnce([makeReservation()]);
    const controller = new AbortController();

    const response = await GET(
      makeRequest("2026-09-10", controller.signal),
      makeParams(),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    listMock.mockResolvedValueOnce([
      makeReservation(),
      makeReservation({ id: "res_2" }),
    ]);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: changed");

    controller.abort();
    await reader.cancel();
  });

  it("does not emit again on a poll where nothing changed", async () => {
    listMock.mockResolvedValue([makeReservation()]);
    const controller = new AbortController();

    const response = await GET(
      makeRequest("2026-09-10", controller.signal),
      makeParams(),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    const text = await readAvailable(reader);
    expect(text).not.toContain("event: changed");

    controller.abort();
    await reader.cancel();
  });

  it("sends a periodic heartbeat comment so idle connections aren't treated as dead by intermediary proxies", async () => {
    listMock.mockResolvedValue([]);
    const controller = new AbortController();

    const response = await GET(
      makeRequest("2026-09-10", controller.signal),
      makeParams(),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain(": ping");

    controller.abort();
    await reader.cancel();
  });

  it("stops polling once the client disconnects (request aborted)", async () => {
    listMock.mockResolvedValue([makeReservation()]);
    const controller = new AbortController();

    const response = await GET(
      makeRequest("2026-09-10", controller.signal),
      makeParams(),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(listMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await response.body!.cancel();

    listMock.mockClear();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(listMock).not.toHaveBeenCalled();
  });
});
