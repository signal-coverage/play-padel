import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { clerkClient } from "@clerk/nextjs/server";
import { POST } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const clerkClientMock = clerkClient as unknown as ReturnType<typeof vi.fn>;
const revokeActorTokenMock = vi.fn();

const ADMIN_ID = "user_admin";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/impersonate/revoke", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  requireAdminMock.mockReset();
  clerkClientMock.mockReset();
  revokeActorTokenMock.mockReset();

  requireAdminMock.mockResolvedValue({
    ok: true,
    context: { userId: ADMIN_ID, displayName: "Admin Person" },
  });
  clerkClientMock.mockResolvedValue({
    actorTokens: { revoke: revokeActorTokenMock },
  });
});

describe("POST /api/admin/impersonate/revoke", () => {
  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest({ actorTokenId: "act_123" }));

    expect(response).toBe(forbidden);
    expect(revokeActorTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(revokeActorTokenMock).not.toHaveBeenCalled();
  });

  it("revokes the actor token via the Clerk SDK and returns ok", async () => {
    revokeActorTokenMock.mockResolvedValue({
      id: "act_123",
      status: "revoked",
    });

    const response = await POST(makeRequest({ actorTokenId: "act_123" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(revokeActorTokenMock).toHaveBeenCalledWith("act_123");
  });

  it("returns 502 when the Clerk SDK call fails", async () => {
    revokeActorTokenMock.mockRejectedValue(new Error("Clerk API error"));

    const response = await POST(makeRequest({ actorTokenId: "act_123" }));

    expect(response.status).toBe(502);
  });
});
