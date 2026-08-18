import { describe, it, expect, vi, afterEach } from "vitest";

// canSelfCancel itself never touches Prisma, but reservations.service.ts
// imports "@/infrastructure/db/client" at module scope, which eagerly builds
// a real PrismaClient/Neon adapter on import. Mock it so importing this test
// file has no live-DB side effects (see docs/SECURITY.md: canSelfCancel is
// the server-side enforcement of the 2-hour self-cancel cutoff).
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {},
}));

import { canSelfCancel } from "@/core/reservations/services/reservations.service";
import { SELF_CANCEL_CUTOFF_HOURS } from "@/core/reservations/consts";

const CUTOFF_MS = SELF_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe("canSelfCancel", () => {
  it("allows cancelling more than 2 hours before scheduledStart", () => {
    const start = new Date(Date.now() + CUTOFF_MS + 60 * 60 * 1000); // 3h out
    expect(canSelfCancel({ status: "CONFIRMED", scheduledStart: start })).toBe(
      true,
    );
  });

  it("rejects cancelling inside the 2-hour window", () => {
    const start = new Date(Date.now() + 60 * 60 * 1000); // 1h out
    expect(canSelfCancel({ status: "CONFIRMED", scheduledStart: start })).toBe(
      false,
    );
  });

  // Boundary case. canSelfCancel's rule is:
  //   Date.now() < scheduledStart.getTime() - cutoffMs
  // a strict inequality. Being exactly 2 hours before the reservation makes
  // `Date.now() === scheduledStart - cutoffMs`, which fails the `<` check —
  // so the exact 2-hour boundary is REJECTED, not allowed. Only strictly
  // *more* than 2 hours of lead time passes.
  it("rejects cancelling at exactly the 2-hour boundary (cutoff is exclusive)", () => {
    vi.useFakeTimers();
    const now = new Date("2026-01-10T08:00:00.000Z");
    vi.setSystemTime(now);

    const start = new Date(now.getTime() + CUTOFF_MS);
    expect(canSelfCancel({ status: "CONFIRMED", scheduledStart: start })).toBe(
      false,
    );
  });

  it("allows cancelling 1ms past the 2-hour boundary", () => {
    vi.useFakeTimers();
    const now = new Date("2026-01-10T08:00:00.000Z");
    vi.setSystemTime(now);

    const start = new Date(now.getTime() + CUTOFF_MS + 1);
    expect(canSelfCancel({ status: "CONFIRMED", scheduledStart: start })).toBe(
      true,
    );
  });

  it("rejects a reservation that is not in an active status, regardless of lead time", () => {
    const start = new Date(Date.now() + 10 * 60 * 60 * 1000); // far in the future
    expect(canSelfCancel({ status: "CANCELLED", scheduledStart: start })).toBe(
      false,
    );
    expect(canSelfCancel({ status: "COMPLETED", scheduledStart: start })).toBe(
      false,
    );
    expect(canSelfCancel({ status: "NO_SHOW", scheduledStart: start })).toBe(
      false,
    );
  });

  it("allows a SCHEDULED (pending-payment) reservation with enough lead time", () => {
    const start = new Date(Date.now() + 10 * 60 * 60 * 1000);
    expect(canSelfCancel({ status: "SCHEDULED", scheduledStart: start })).toBe(
      true,
    );
  });
});
