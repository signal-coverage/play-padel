import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  listRecipientNotifications: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { listRecipientNotifications } from "@/core/notifications/services/notifications.service";
import { GET, POLL_INTERVAL_MS, HEARTBEAT_INTERVAL_MS } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listMock = listRecipientNotifications as ReturnType<typeof vi.fn>;

const NOTIFICATION_A = {
  id: "n1",
  clubId: "club_1",
  type: "CLUB_APPROVED",
  recipientId: "user_1",
  recipientEmail: "owner@example.com",
  title: "Your club has been approved",
  message: "<p>irrelevant html</p>",
  status: "SENT",
  createdAt: new Date("2026-09-10T00:00:00.000Z"),
};

const NOTIFICATION_B = {
  ...NOTIFICATION_A,
  id: "n2",
  title: "A second, later notification",
};

// Reads whatever's currently buffered in the stream without blocking
// forever waiting for more — a real client keeps the connection open
// indefinitely, but a test just wants "what has been enqueued so far".
// A real setTimeout-based race doesn't work here: vi.useFakeTimers() is
// active for this whole file, so a real setTimeout would never actually
// fire on its own — vi.advanceTimersByTimeAsync is what reliably resolves
// while the stream itself, if genuinely idle, has nothing more to give
// reader.read() and just stays pending.
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

describe("GET /api/notifications/stream", () => {
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

    const response = await GET(
      new Request("http://localhost/api/notifications/stream"),
    );

    expect(response.status).toBe(401);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("streams as text/event-stream and does not emit a notification event for the initial poll (it's just the baseline)", async () => {
    listMock.mockResolvedValue([NOTIFICATION_A]);
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost/api/notifications/stream", {
        signal: controller.signal,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    // Flush the fire-and-forget initial poll() call.
    await vi.advanceTimersByTimeAsync(0);

    const reader = response.body!.getReader();
    const text = await readAvailable(reader);
    expect(text).not.toContain("event: notification");
    expect(listMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await reader.cancel();
  });

  it("emits one notification event per genuinely NEW notification on a later poll, leaving already-seen ones alone", async () => {
    listMock.mockResolvedValueOnce([NOTIFICATION_A]);
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost/api/notifications/stream", {
        signal: controller.signal,
      }),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    listMock.mockResolvedValueOnce([NOTIFICATION_A, NOTIFICATION_B]);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    // Already enqueued by this point (advanceTimersByTimeAsync flushed the
    // whole poll() chain, enqueue included) — a plain read resolves off
    // the stream's own queued chunk, no race/timeout needed.
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: notification");
    // Only the new one — Notification A was already in the baseline.
    expect(text).toContain(NOTIFICATION_B.id);
    expect(text).not.toContain(NOTIFICATION_A.title);

    const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
    expect(dataLine).toBeDefined();
    const payload = JSON.parse(dataLine!.slice("data: ".length));
    expect(payload.id).toBe(NOTIFICATION_B.id);
    expect(payload.title).toBe(NOTIFICATION_B.title);

    controller.abort();
    await reader.cancel();
  });

  it("sends a periodic heartbeat comment so idle connections aren't treated as dead by intermediary proxies", async () => {
    listMock.mockResolvedValue([]);
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost/api/notifications/stream", {
        signal: controller.signal,
      }),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    // Already enqueued by this point — see the identical comment in the
    // "new notification" test above for why a plain read (no race) is
    // safe here.
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain(": ping");

    controller.abort();
    await reader.cancel();
  });

  it("stops polling once the client disconnects (request aborted)", async () => {
    listMock.mockResolvedValue([NOTIFICATION_A]);
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost/api/notifications/stream", {
        signal: controller.signal,
      }),
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
