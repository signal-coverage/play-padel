import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/notifications/services/notifications.service", () => ({
  markAsRead: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { markAsRead } from "@/core/notifications/services/notifications.service";
import { PATCH } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const markAsReadMock = markAsRead as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  authMock.mockReset();
  markAsReadMock.mockReset();
});

describe("PATCH /api/notifications/[id]/read", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await PATCH(
      new Request("http://localhost"),
      makeParams("notif_1"),
    );

    expect(response.status).toBe(401);
    expect(markAsReadMock).not.toHaveBeenCalled();
  });

  it("marks the given notification as read, scoped to the authenticated userId, and returns ok: true", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    markAsReadMock.mockResolvedValue(undefined);

    const response = await PATCH(
      new Request("http://localhost"),
      makeParams("notif_1"),
    );
    const body = await response.json();

    expect(markAsReadMock).toHaveBeenCalledWith("user_1", "notif_1");
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});
