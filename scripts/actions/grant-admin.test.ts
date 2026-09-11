import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUniqueMock, updateMock, disconnectMock, dispatchMock } = vi.hoisted(
  () => ({
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    disconnectMock: vi.fn(),
    dispatchMock: vi.fn(),
  }),
);

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

import { grantAdmin } from "./grant-admin";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  disconnectMock.mockReset();
  dispatchMock.mockReset();
  dispatchMock.mockResolvedValue(undefined);
});

describe("grantAdmin", () => {
  it("sends an ADMIN_ACCESS_GRANTED notification (email + in-app) the moment a profile actually gains admin access", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: false,
    });
    updateMock.mockResolvedValue({});

    await grantAdmin("jane@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { isAdmin: true },
    });
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ADMIN_ACCESS_GRANTED",
        clubId: null,
        recipientId: "user_1",
        recipientEmail: "jane@example.com",
        recipientName: "Jane Doe",
        sendEmail: true,
      }),
    );
  });

  it("does not send a notification when the target profile can't be found", async () => {
    findUniqueMock.mockResolvedValue(null);

    await grantAdmin("nobody@example.com");

    expect(updateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("does not send a notification when the profile was already an admin (no actual grant happened)", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: true,
    });

    await grantAdmin("jane@example.com");

    expect(updateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("a notification-dispatch failure never blocks the admin grant from having already happened", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      displayName: "Jane Doe",
      isAdmin: false,
    });
    updateMock.mockResolvedValue({});
    dispatchMock.mockRejectedValue(new Error("resend is down"));

    await expect(grantAdmin("jane@example.com")).resolves.not.toThrow();
    expect(updateMock).toHaveBeenCalled();
  });
});
