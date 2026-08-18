import { describe, expect, it, vi } from "vitest";

// courts.service.ts eagerly constructs a real Prisma/Neon client at import
// time (same reason the self-cancel-cutoff test needs this) — mock it so
// importing the module for this one pure function doesn't require a real
// DATABASE_URL.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {},
}));

import { hasAnyFreeSlot } from "./courts.service";
import type { Slot } from "@/core/courts/types";

function makeSlot(status: Slot["status"]): Slot {
  return { start: new Date(), end: new Date(), status };
}

describe("hasAnyFreeSlot", () => {
  it("returns false for an empty list of courts", () => {
    expect(hasAnyFreeSlot([])).toBe(false);
  });

  it("returns false when a court has slots but none are free", () => {
    const courts: Slot[][] = [[makeSlot("locked"), makeSlot("closed")]];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });

  it("returns false across multiple courts when none has a free slot", () => {
    const courts: Slot[][] = [
      [makeSlot("locked")],
      [makeSlot("closed"), makeSlot("locked")],
    ];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });

  it("returns true when at least one slot on any court is free", () => {
    const courts: Slot[][] = [
      [makeSlot("locked")],
      [makeSlot("locked"), makeSlot("free")],
    ];
    expect(hasAnyFreeSlot(courts)).toBe(true);
  });

  it("returns false when a court has zero slots at all", () => {
    const courts: Slot[][] = [[], []];
    expect(hasAnyFreeSlot(courts)).toBe(false);
  });
});
