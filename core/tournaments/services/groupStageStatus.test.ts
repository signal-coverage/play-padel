import { describe, it, expect } from "vitest";
import { isGroupStageComplete } from "./groupStageStatus";

describe("isGroupStageComplete", () => {
  it("is true for a group with no matches at all", () => {
    expect(isGroupStageComplete([])).toBe(true);
  });

  it("is false while any match is still SCHEDULED", () => {
    expect(
      isGroupStageComplete([{ status: "COMPLETED" }, { status: "SCHEDULED" }]),
    ).toBe(false);
  });

  it("is true once every match is COMPLETED or WALKOVER", () => {
    expect(
      isGroupStageComplete([
        { status: "COMPLETED" },
        { status: "WALKOVER" },
        { status: "COMPLETED" },
      ]),
    ).toBe(true);
  });

  it("treats CANCELLED as resolved (won't ever produce a score)", () => {
    expect(
      isGroupStageComplete([{ status: "COMPLETED" }, { status: "CANCELLED" }]),
    ).toBe(true);
  });
});
