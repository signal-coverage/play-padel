import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  markAllAsRead: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { markAllAsRead } from "@/core/notifications/services/notifications.service";
import { PATCH } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const markAllAsReadMock = markAllAsRead as ReturnType<typeof vi.fn>;

beforeEach(() => {
  authMock.mockReset();
  markAllAsReadMock.mockReset();
});

describe("PATCH /api/notifications/read-all", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await PATCH();

    expect(response.status).toBe(401);
    expect(markAllAsReadMock).not.toHaveBeenCalled();
  });

  it("marks all notifications as read for the authenticated userId and returns ok: true", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    markAllAsReadMock.mockResolvedValue(undefined);

    const response = await PATCH();
    const body = await response.json();

    expect(markAllAsReadMock).toHaveBeenCalledWith("user_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});
