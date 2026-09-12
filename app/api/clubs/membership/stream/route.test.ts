import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  getMembershipSubscription: vi.fn(),
}));

import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import { getMembershipSubscription } from "@/core/billing/services/membership.service";
import { GET, POLL_INTERVAL_MS, HEARTBEAT_INTERVAL_MS } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getSubscriptionMock = getMembershipSubscription as ReturnType<
  typeof vi.fn
>;

function makeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    clubId: "club_1",
    plan: "PRO",
    cycle: "MONTHLY",
    status: "PENDING",
    ...overrides,
  };
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

describe("GET /api/clubs/membership/stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requireOwnerClubMock.mockReset();
    getSubscriptionMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the requireOwnerClub failure response as-is when the caller isn't an owner, without ever polling", async () => {
    requireOwnerClubMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await GET(new Request("http://localhost"));

    expect(response.status).toBe(403);
    expect(getSubscriptionMock).not.toHaveBeenCalled();
  });

  it("streams as text/event-stream and does not emit a changed event for the initial poll (it's just the baseline)", async () => {
    getSubscriptionMock.mockResolvedValue(makeSubscription());
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost", { signal: controller.signal }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();
    const text = await readAvailable(reader);
    expect(text).not.toContain("event: changed");
    expect(getSubscriptionMock).toHaveBeenCalledWith("club_1");

    controller.abort();
    await reader.cancel();
  });

  it("emits a changed event with the new status once the subscription's status actually changes", async () => {
    getSubscriptionMock.mockResolvedValueOnce(
      makeSubscription({ status: "PENDING" }),
    );
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost", { signal: controller.signal }),
    );
    await vi.advanceTimersByTimeAsync(0);
    const reader = response.body!.getReader();

    getSubscriptionMock.mockResolvedValueOnce(
      makeSubscription({ status: "TRIALING" }),
    );
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: changed");

    const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
    const payload = JSON.parse(dataLine!.slice("data: ".length));
    expect(payload.status).toBe("TRIALING");

    controller.abort();
    await reader.cancel();
  });

  it("does not emit again on a poll where nothing changed", async () => {
    getSubscriptionMock.mockResolvedValue(
      makeSubscription({ status: "PENDING" }),
    );
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost", { signal: controller.signal }),
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
    getSubscriptionMock.mockResolvedValue(null);
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost", { signal: controller.signal }),
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
    getSubscriptionMock.mockResolvedValue(makeSubscription());
    const controller = new AbortController();

    const response = await GET(
      new Request("http://localhost", { signal: controller.signal }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(getSubscriptionMock).toHaveBeenCalledTimes(1);

    controller.abort();
    await response.body!.cancel();

    getSubscriptionMock.mockClear();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(getSubscriptionMock).not.toHaveBeenCalled();
  });
});
