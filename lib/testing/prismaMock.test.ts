import { describe, it, expect, beforeEach } from "vitest";
import { mockReset } from "vitest-mock-extended";
import type { UserProfile } from "@/lib/generated/prisma/client";
import { createPrismaMock, type MockPrismaClient } from "./prismaMock";

// This file doubles as the reference usage example for `createPrismaMock`.
// A future test author copies this pattern to get a fully typed Prisma
// mock instead of hand-rolling `vi.mock("@/infrastructure/db/client", ...)`.

describe("createPrismaMock", () => {
  let prisma: MockPrismaClient;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  it("returns a mock exposing every PrismaClient model as a jest/vitest mock function", () => {
    expect(typeof prisma.userProfile.findUnique).toBe("function");
    expect(typeof prisma.club.findMany).toBe("function");
  });

  it("lets a model method be stubbed and asserted on like any vi.fn()", async () => {
    const fakeProfile = {
      id: "user_123",
      role: "player",
      isAdmin: false,
      clubId: null,
      displayName: "Test Player",
      firstName: null,
    } as unknown as UserProfile;

    prisma.userProfile.findUnique.mockResolvedValue(fakeProfile);

    const result = await prisma.userProfile.findUnique({
      where: { id: "user_123" },
    });

    // The return value type-checks against the real UserProfile model type —
    // a renamed field here would fail `tsc`, not just fail silently at
    // runtime like the untyped hand-rolled mock pattern would.
    expect(result?.displayName).toBe("Test Player");
    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { id: "user_123" },
    });
  });

  it("mockReset from vitest-mock-extended clears prior stubbed behavior", async () => {
    prisma.userProfile.findUnique.mockResolvedValue({
      id: "user_123",
    } as unknown as UserProfile);

    mockReset(prisma);

    const result = await prisma.userProfile.findUnique({
      where: { id: "user_123" },
    });

    expect(result).toBeUndefined();
  });
});
