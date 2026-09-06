import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  listRecipientNotifications: vi.fn(),
  countUnreadNotifications: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import {
  listRecipientNotifications,
  countUnreadNotifications,
} from "@/core/notifications/services/notifications.service";
import { GET } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listRecipientNotificationsMock = listRecipientNotifications as ReturnType<
  typeof vi.fn
>;
const countUnreadNotificationsMock = countUnreadNotifications as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  authMock.mockReset();
  listRecipientNotificationsMock.mockReset();
  countUnreadNotificationsMock.mockReset();
});

describe("GET /api/notifications", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listRecipientNotificationsMock).not.toHaveBeenCalled();
    expect(countUnreadNotificationsMock).not.toHaveBeenCalled();
  });

  it("returns notifications and unreadCount scoped to the authenticated userId", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    const notifications = [
      {
        id: "notif-1",
        clubId: "club-1",
        type: "PAYMENT_RECEIVED",
        recipientId: "user_1",
        recipientEmail: "user@example.com",
        title: "Payment received",
        message: "Your payment was received.",
        status: "SENT",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    listRecipientNotificationsMock.mockResolvedValue(notifications);
    countUnreadNotificationsMock.mockResolvedValue(3);

    const response = await GET();
    const body = await response.json();

    expect(listRecipientNotificationsMock).toHaveBeenCalledWith("user_1");
    expect(countUnreadNotificationsMock).toHaveBeenCalledWith("user_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({
      notifications: [
        {
          ...notifications[0],
          createdAt: notifications[0].createdAt.toISOString(),
        },
      ],
      unreadCount: 3,
    });
  });
});
