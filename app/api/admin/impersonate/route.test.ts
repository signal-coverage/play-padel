import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import { clerkClient } from "@clerk/nextjs/server";
import { POST } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;
const clerkClientMock = clerkClient as unknown as ReturnType<typeof vi.fn>;
const createActorTokenMock = vi.fn();

const ADMIN_ID = "user_admin";
const TARGET_ID = "user_target";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/impersonate", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  requireAdminMock.mockReset();
  findUniqueMock.mockReset();
  logAuditMock.mockReset();
  clerkClientMock.mockReset();
  createActorTokenMock.mockReset();

  requireAdminMock.mockResolvedValue({
    ok: true,
    context: { userId: ADMIN_ID, displayName: "Admin Person" },
  });
  clerkClientMock.mockResolvedValue({
    actorTokens: { create: createActorTokenMock },
  });
});

describe("POST /api/admin/impersonate", () => {
  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await POST(makeRequest({ userId: TARGET_ID }));

    expect(response).toBe(forbidden);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createActorTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(createActorTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the admin tries to impersonate themselves", async () => {
    const response = await POST(makeRequest({ userId: ADMIN_ID }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/cannot impersonate yourself/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createActorTokenMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target userId has no UserProfile row", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ userId: TARGET_ID }));

    expect(response.status).toBe(404);
    expect(createActorTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the target is another admin", async () => {
    findUniqueMock.mockResolvedValue({
      id: TARGET_ID,
      isAdmin: true,
      displayName: "Other Admin",
    });

    const response = await POST(makeRequest({ userId: TARGET_ID }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/cannot impersonate another admin/i);
    expect(createActorTokenMock).not.toHaveBeenCalled();
  });

  it("creates the actor token via the Clerk SDK, logs the audit entry, and returns the sign-in url", async () => {
    findUniqueMock.mockResolvedValue({
      id: TARGET_ID,
      isAdmin: false,
      displayName: "Target Player",
    });
    createActorTokenMock.mockResolvedValue({
      id: "act_123",
      token: "super-secret-token",
      url: "https://example.clerk.accounts.dev/sign-in-tokens/act_123",
    });

    const response = await POST(makeRequest({ userId: TARGET_ID }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      url: "https://example.clerk.accounts.dev/sign-in-tokens/act_123",
    });

    expect(createActorTokenMock).toHaveBeenCalledWith({
      userId: TARGET_ID,
      actor: { sub: ADMIN_ID },
      expiresInSeconds: 3600,
      sessionMaxDurationInSeconds: 1800,
    });

    expect(logAuditMock).toHaveBeenCalledWith({
      clubId: null,
      userId: ADMIN_ID,
      userDisplayName: "Admin Person",
      action: "user.impersonated",
      entity: "UserProfile",
      entityId: TARGET_ID,
      metadata: {
        actorTokenId: "act_123",
        targetDisplayName: "Target Player",
      },
    });

    // Never leak the raw token anywhere in the response body.
    expect(JSON.stringify(body)).not.toMatch(/super-secret-token/);
  });
});
