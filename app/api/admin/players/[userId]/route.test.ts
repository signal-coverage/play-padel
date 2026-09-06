import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/core/users/services/users.service", () => ({
  updateUserProfile: vi.fn(),
  anonymizeUserProfile: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import {
  updateUserProfile,
  anonymizeUserProfile,
} from "@/core/users/services/users.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { PATCH, DELETE } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const updateUserProfileMock = updateUserProfile as ReturnType<typeof vi.fn>;
const anonymizeUserProfileMock = anonymizeUserProfile as ReturnType<
  typeof vi.fn
>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

const ADMIN_ID = "user_admin";
const PLAYER_ID = "user_player";

const PLAYER_ROW = {
  id: PLAYER_ID,
  role: "player",
  displayName: "Old Name",
  email: "old@example.com",
  phone: "+541100000000",
  padelCategory: 5,
  preferredSide: "forehand",
  dominantHand: "right",
  photoURL: null,
};

function makeParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/players/x", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

function makeDeleteRequest() {
  return new Request("http://localhost/api/admin/players/x", {
    method: "DELETE",
  }) as unknown as Parameters<typeof DELETE>[0];
}

beforeEach(() => {
  authMock.mockReset();
  findUniqueMock.mockReset();
  updateUserProfileMock.mockReset();
  anonymizeUserProfileMock.mockReset();
  logAuditMock.mockReset();

  authMock.mockResolvedValue({ userId: ADMIN_ID });
  // First call inside requireAdminProfile resolves the admin's own gate;
  // the second call (inside the route) resolves the target player row.
  findUniqueMock.mockImplementation(({ where: { id } }) => {
    if (id === ADMIN_ID) {
      return Promise.resolve({ isAdmin: true, displayName: "Admin Person" });
    }
    if (id === PLAYER_ID) {
      return Promise.resolve(PLAYER_ROW);
    }
    return Promise.resolve(null);
  });
});

describe("PATCH /api/admin/players/[userId]", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await PATCH(
      makeRequest({ displayName: "New Name" }),
      makeParams(PLAYER_ID),
    );

    expect(response.status).toBe(401);
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not an admin", async () => {
    findUniqueMock.mockImplementation(({ where: { id } }) => {
      if (id === ADMIN_ID) {
        return Promise.resolve({ isAdmin: false, displayName: "Admin" });
      }
      return Promise.resolve(PLAYER_ROW);
    });

    const response = await PATCH(
      makeRequest({ displayName: "New Name" }),
      makeParams(PLAYER_ID),
    );

    expect(response.status).toBe(403);
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target userId has no UserProfile row", async () => {
    const response = await PATCH(
      makeRequest({ displayName: "New Name" }),
      makeParams("does_not_exist"),
    );

    expect(response.status).toBe(404);
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target userId belongs to an owner, not a player", async () => {
    findUniqueMock.mockImplementation(({ where: { id } }) => {
      if (id === ADMIN_ID) {
        return Promise.resolve({ isAdmin: true, displayName: "Admin" });
      }
      if (id === "owner_1") {
        return Promise.resolve({ ...PLAYER_ROW, id: "owner_1", role: "owner" });
      }
      return Promise.resolve(null);
    });

    const response = await PATCH(
      makeRequest({ displayName: "New Name" }),
      makeParams("owner_1"),
    );

    expect(response.status).toBe(404);
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const response = await PATCH(
      makeRequest({ email: "not-an-email" }),
      makeParams(PLAYER_ID),
    );

    expect(response.status).toBe(400);
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("updates the player, logs the audit entry with the admin as actor, and returns the merged player", async () => {
    const response = await PATCH(
      makeRequest({ displayName: "New Name", padelCategory: 3 }),
      makeParams(PLAYER_ID),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserProfileMock).toHaveBeenCalledWith(
      PLAYER_ID,
      { displayName: "New Name", padelCategory: 3 },
      ADMIN_ID,
    );
    expect(logAuditMock).toHaveBeenCalledWith({
      clubId: null,
      userId: ADMIN_ID,
      userDisplayName: "Admin Person",
      action: "user.updated",
      entity: "UserProfile",
      entityId: PLAYER_ID,
      metadata: { displayName: "New Name", padelCategory: 3 },
    });
    expect(body.player).toEqual({
      id: PLAYER_ID,
      displayName: "New Name",
      avatarUrl: null,
      padelCategory: 3,
      preferredSide: "forehand",
      dominantHand: "right",
      email: "old@example.com",
      phone: "+541100000000",
    });
  });
});

describe("DELETE /api/admin/players/[userId]", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await DELETE(makeDeleteRequest(), makeParams(PLAYER_ID));

    expect(response.status).toBe(401);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not an admin", async () => {
    findUniqueMock.mockImplementation(({ where: { id } }) => {
      if (id === ADMIN_ID) {
        return Promise.resolve({ isAdmin: false, displayName: "Admin" });
      }
      return Promise.resolve(PLAYER_ROW);
    });

    const response = await DELETE(makeDeleteRequest(), makeParams(PLAYER_ID));

    expect(response.status).toBe(403);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 400 when an admin tries to delete their own account", async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams(ADMIN_ID));

    expect(response.status).toBe(400);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target userId has no UserProfile row", async () => {
    const response = await DELETE(
      makeDeleteRequest(),
      makeParams("does_not_exist"),
    );

    expect(response.status).toBe(404);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target userId belongs to an owner, not a player", async () => {
    findUniqueMock.mockImplementation(({ where: { id } }) => {
      if (id === ADMIN_ID) {
        return Promise.resolve({ isAdmin: true, displayName: "Admin" });
      }
      if (id === "owner_1") {
        return Promise.resolve({ ...PLAYER_ROW, id: "owner_1", role: "owner" });
      }
      return Promise.resolve(null);
    });

    const response = await DELETE(makeDeleteRequest(), makeParams("owner_1"));

    expect(response.status).toBe(404);
    expect(anonymizeUserProfileMock).not.toHaveBeenCalled();
  });

  it("anonymizes the player and logs the audit entry with the admin as actor and the player's original name", async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams(PLAYER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(anonymizeUserProfileMock).toHaveBeenCalledWith(PLAYER_ID, ADMIN_ID);
    expect(logAuditMock).toHaveBeenCalledWith({
      clubId: null,
      userId: ADMIN_ID,
      userDisplayName: "Admin Person",
      action: "user.anonymized",
      entity: "UserProfile",
      entityId: PLAYER_ID,
      metadata: { targetDisplayName: "Old Name" },
    });
  });
});
