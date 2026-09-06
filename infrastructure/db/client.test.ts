import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@prisma/adapter-neon", () => ({
  PrismaNeon: vi.fn(),
}));
vi.mock("@/lib/generated/prisma/client", () => ({
  PrismaClient: vi.fn(),
}));
vi.mock("ws", () => ({ default: {} }));

describe("infrastructure/db/client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws a clear error at load time when DATABASE_URL is not set", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("./client")).rejects.toThrow("DATABASE_URL is not set");
  });

  it("constructs the Prisma client normally when DATABASE_URL is set", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");

    await expect(import("./client")).resolves.toBeDefined();
  });
});
