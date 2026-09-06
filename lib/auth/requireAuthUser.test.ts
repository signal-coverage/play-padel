import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { requireAuthUser } from "./requireAuthUser";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  authMock.mockReset();
});

describe("requireAuthUser", () => {
  it("returns a 401 response when there is no signed-in Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await requireAuthUser();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    }
  });

  it("returns the caller's userId when signed in", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });

    const result = await requireAuthUser();

    expect(result).toEqual({ ok: true, userId: "user_1" });
  });
});
