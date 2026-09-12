import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  listReservationsByUser: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { listReservationsByUser } from "@/core/reservations/services/reservations.service";
import { GET, POLL_INTERVAL_MS, HEARTBEAT_INTERVAL_MS } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listMock = listReservationsByUser as ReturnType<typeof vi.fn>;

function makeReservation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "res_1",
    status: "SCHEDULED",
    paymentExpiresAt: new Date("2026-09-10T00:15:00.000Z"),
    ...overrides,
  };
}

function makeRequest(reservationId: string | null, signal?: AbortSignal) {
  const url = reservationId
    ? `http://localhost/api/player/reservations/stream?reservationId=${reservationId}`
    : "http://localhost/api/player/reservations/stream";
  return new NextRequest(url, { signal });
}

// Same fake-timer race as app/api/notifications/stream/route.test.ts (see
// that file's own comment for why a real setTimeout never fires here).
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

describe("GET /api/player/reservations/stream", () => {
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

    const response = await GET(makeRequest("res_1"));

    expect(response.status).toBe(401);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("returns 400 when reservationId is missing, without ever polling", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("streams as text/event-stream and does not emit a changed event for the initial poll (it's just the baseline)", async () => {
    listMock.mockResolvedValue([makeReservation()]);
    const controller = new AbortController();

    const response = await GET(makeRequest("res_1", controller.signal));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();
    const text = await readAvailable(reader);
    expect(text).not.toContain("event: changed");
    expect(listMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await reader.cancel();
  });

  it("emits a changed event with the new status once the reservation's status/paymentExpiresAt actually changes", async () => {
    listMock.mockResolvedValueOnce([makeReservation({ status: "SCHEDULED" })]);
    const controller = new AbortController();

    const response = await GET(makeRequest("res_1", controller.signal));
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    listMock.mockResolvedValueOnce([makeReservation({ status: "CONFIRMED" })]);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: changed");

    const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
    expect(dataLine).toBeDefined();
    const payload = JSON.parse(dataLine!.slice("data: ".length));
    expect(payload.status).toBe("CONFIRMED");

    controller.abort();
    await reader.cancel();
  });

  it("does not emit again on a poll where nothing changed", async () => {
    listMock.mockResolvedValue([makeReservation({ status: "SCHEDULED" })]);
    const controller = new AbortController();

    const response = await GET(makeRequest("res_1", controller.signal));
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

    const response = await GET(makeRequest("res_1", controller.signal));
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

    const response = await GET(makeRequest("res_1", controller.signal));
    await vi.advanceTimersByTimeAsync(0);
    expect(listMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await response.body!.cancel();

    listMock.mockClear();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(listMock).not.toHaveBeenCalled();
  });
});
