import { describe, it, expect } from "vitest";
import { toClubClosure } from "./utils";
import type { RawClubClosure } from "./types";

const raw: RawClubClosure = {
  id: "closure_1",
  courtId: "court_1",
  courtName: "Court 1",
  startsAt: "2026-10-01T10:00:00.000Z",
  endsAt: "2026-10-01T18:00:00.000Z",
  reason: "Club rented for a tournament",
  createdAt: "2026-09-15T00:00:00.000Z",
  createdBy: "user_1",
};

describe("toClubClosure", () => {
  it("parses date strings into Date instances", () => {
    const closure = toClubClosure(raw);

    expect(closure.startsAt).toEqual(new Date(raw.startsAt));
    expect(closure.endsAt).toEqual(new Date(raw.endsAt));
    expect(closure.createdAt).toEqual(new Date(raw.createdAt));
  });

  it("carries the court name through unchanged", () => {
    expect(toClubClosure(raw).courtName).toBe("Court 1");
  });

  it("leaves cancelledAt undefined when the closure was never cancelled", () => {
    expect(toClubClosure(raw).cancelledAt).toBeUndefined();
  });

  it("parses cancelledAt into a Date when present", () => {
    const cancelled: RawClubClosure = {
      ...raw,
      cancelledAt: "2026-09-20T00:00:00.000Z",
      cancelledBy: "user_2",
    };

    const closure = toClubClosure(cancelled);

    expect(closure.cancelledAt).toEqual(new Date(cancelled.cancelledAt!));
    expect(closure.cancelledBy).toBe("user_2");
  });
});
