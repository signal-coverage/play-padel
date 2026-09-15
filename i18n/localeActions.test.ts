import { describe, it, expect, vi, beforeEach } from "vitest";

const { cookieSetMock, authMock, updateManyMock } = vi.hoisted(() => ({
  cookieSetMock: vi.fn(),
  authMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: cookieSetMock }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      updateMany: updateManyMock,
    },
  },
}));

import { setUserLocale } from "./localeActions";

beforeEach(() => {
  cookieSetMock.mockReset();
  authMock.mockReset();
  updateManyMock.mockReset().mockResolvedValue({ count: 1 });
});

describe("setUserLocale", () => {
  it("always sets the locale cookie, signed in or not", async () => {
    authMock.mockResolvedValue({ userId: null });

    await setUserLocale("en");

    expect(cookieSetMock).toHaveBeenCalledWith("locale", "en");
  });

  it("does not touch the database for a signed-out visitor (e.g. flipping the landing header switcher before signing up)", async () => {
    authMock.mockResolvedValue({ userId: null });

    await setUserLocale("en");

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("also persists the locale to UserProfile for a signed-in user", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });

    await setUserLocale("en");

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: { locale: "en", updatedBy: "user_123" },
    });
  });

  // updateMany (never throws on a zero-row match) — a signed-in Clerk user
  // who hasn't finished onboarding yet has no UserProfile row at all (see
  // app/api/onboarding/route.ts), and flipping the switcher before signing
  // up is a completely valid, common case this must not error on.
  it("does not throw when the signed-in user has no UserProfile row yet", async () => {
    authMock.mockResolvedValue({ userId: "user_ghost" });
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(setUserLocale("es")).resolves.not.toThrow();
  });
});
