import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findUniqueMock,
  updateMock,
  disconnectMock,
  dispatchMock,
  updateUserMetadataMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  disconnectMock: vi.fn(),
  dispatchMock: vi.fn(),
  updateUserMetadataMock: vi.fn(),
}));

vi.mock("../../infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    $disconnect: disconnectMock,
  },
}));

vi.mock("../../lib/notifications/dispatcher", () => ({
  dispatch: dispatchMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { updateUserMetadata: updateUserMetadataMock },
  }),
}));

import { revokeAdmin } from "./revoke-admin";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  disconnectMock.mockReset();
  dispatchMock.mockReset();
  dispatchMock.mockResolvedValue(undefined);
  updateUserMetadataMock.mockReset();
  updateUserMetadataMock.mockResolvedValue(undefined);
});

describe("revokeAdmin", () => {
  it("sets isAdmin back to false for a profile that currently has admin access", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });
    updateMock.mockResolvedValue({});

    await revokeAdmin("jane@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { isAdmin: false },
    });
  });

  it("sends an ADMIN_ACCESS_REVOKED notification (email + in-app) the moment a profile actually loses admin access", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });
    updateMock.mockResolvedValue({});

    await revokeAdmin("jane@example.com");

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADMIN_ACCESS_REVOKED",
        clubId: null,
        recipientId: "user_1",
        recipientEmail: "jane@example.com",
        recipientName: "Jane Doe",
        sendEmail: true,
      }),
    );
  });

  it("does nothing when the target profile can't be found", async () => {
    findUniqueMock.mockResolvedValue(null);

    await revokeAdmin("nobody@example.com");

    expect(updateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the profile isn't an admin in the first place", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: false,
    });

    await revokeAdmin("jane@example.com");

    expect(updateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("a notification-dispatch failure never blocks the admin revoke from having already happened", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });
    updateMock.mockResolvedValue({});
    dispatchMock.mockRejectedValue(new Error("resend is down"));

    await expect(revokeAdmin("jane@example.com")).resolves.not.toThrow();
    expect(updateMock).toHaveBeenCalled();
  });

  it("always disconnects, even when nothing was updated", async () => {
    findUniqueMock.mockResolvedValue(null);

    await revokeAdmin("nobody@example.com");

    expect(disconnectMock).toHaveBeenCalled();
  });

  it("also clears Clerk publicMetadata.isAdmin so both admin flags stay in sync", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });
    updateMock.mockResolvedValue({});

    await revokeAdmin("jane@example.com");

    expect(updateUserMetadataMock).toHaveBeenCalledWith("user_1", {
      publicMetadata: { isAdmin: false },
    });
  });

  it("a Clerk metadata sync failure never blocks the DB revoke from having already happened", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });
    updateMock.mockResolvedValue({});
    updateUserMetadataMock.mockRejectedValue(new Error("Clerk API is down"));

    await expect(revokeAdmin("jane@example.com")).resolves.not.toThrow();
    expect(updateMock).toHaveBeenCalled();
  });
});
