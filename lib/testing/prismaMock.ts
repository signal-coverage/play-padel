import { mockDeep } from "vitest-mock-extended";
import type { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Shared, type-safe Prisma mock helper for Vitest.
 *
 * WHEN TO USE THIS:
 * - New test files that need to mock `@/infrastructure/db/client`'s `prisma`
 *   export. `createPrismaMock()` returns a `mockDeep<PrismaClient>()` from
 *   `vitest-mock-extended`, so every model/method on it is checked against
 *   the REAL generated `PrismaClient` type. A renamed model or method in
 *   `prisma/schema.prisma` (after `prisma generate`) fails `tsc`, instead of
 *   only surfacing at test runtime as "undefined is not a function".
 *
 * WHEN NOT TO (still valid, not mandatory to migrate):
 * - The ~160 existing test files that hand-roll their own untyped mock, e.g.
 *   `vi.mock("@/infrastructure/db/client", () => ({ prisma: { userProfile:
 *   { findUnique: vi.fn() } } }))`. That pattern keeps working and is not
 *   being migrated by this helper's introduction — this is an available
 *   upgrade for new tests, not a required rewrite of old ones.
 *
 * See `lib/testing/prismaMock.test.ts` for a full usage example, including
 * how to reset stubbed behavior between tests with `mockReset` from
 * `vitest-mock-extended`.
 */
export type MockPrismaClient = ReturnType<typeof mockDeep<PrismaClient>>;

export function createPrismaMock(): MockPrismaClient {
  return mockDeep<PrismaClient>();
}
