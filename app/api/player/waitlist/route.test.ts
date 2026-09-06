import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    court: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/core/waitlist/services/waitlist.service", () => ({
  joinWaitlist: vi.fn(),
}));

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { joinWaitlist } from "@/core/waitlist/services/waitlist.service";
import { checkBotId } from "botid/server";
import { checkRateLimit } from "@vercel/firewall";
import { POST } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.court.findUnique as ReturnType<typeof vi.fn>;
const joinWaitlistMock = joinWaitlist as ReturnType<typeof vi.fn>;
const checkBotIdMock = checkBotId as unknown as ReturnType<typeof vi.fn>;
const checkRateLimitMock = checkRateLimit as unknown as ReturnType<
  typeof vi.fn
>;

const COURT = { id: "court_1", name: "Court 1", clubId: "club_1" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/player/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function validBody() {
  return {
    courtId: COURT.id,
    scheduledStart: "2026-08-20T10:00:00.000Z",
    scheduledEnd: "2026-08-20T11:00:00.000Z",
  };
}

describe("POST /api/player/waitlist", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
    joinWaitlistMock.mockReset();
    checkBotIdMock.mockReset();
    checkRateLimitMock.mockReset();

    authMock.mockResolvedValue({ userId: "user_1" });
    findUniqueMock.mockResolvedValue(COURT);
    joinWaitlistMock.mockResolvedValue({ id: "entry_1" });
    checkBotIdMock.mockResolvedValue({ isBot: false });
    checkRateLimitMock.mockResolvedValue({ rateLimited: false });
  });

  it("returns 401 when there is no authenticated user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(401);
    expect(joinWaitlistMock).not.toHaveBeenCalled();
  });

  it("returns 403 when BotID classifies the request as a bot", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(403);
    expect(joinWaitlistMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the shared rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: true });

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(429);
    expect(joinWaitlistMock).not.toHaveBeenCalled();
  });

  it("joins the waitlist when auth, bot check, and rate limit all pass", async () => {
    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(200);
    expect(joinWaitlistMock).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: COURT.id, userId: "user_1" }),
    );
  });
});
