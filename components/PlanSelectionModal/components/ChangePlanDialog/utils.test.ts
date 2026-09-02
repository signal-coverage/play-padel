import { describe, it, expect } from "vitest";
import { resolveNextPlanOnArrowKey } from "./utils";

describe("resolveNextPlanOnArrowKey", () => {
  it("moves forward on ArrowRight/ArrowDown, wrapping past MAX back to BASIC", () => {
    expect(resolveNextPlanOnArrowKey("ArrowRight", "BASIC")).toBe("PRO");
    expect(resolveNextPlanOnArrowKey("ArrowDown", "PLUS")).toBe("MAX");
    expect(resolveNextPlanOnArrowKey("ArrowRight", "MAX")).toBe("BASIC");
  });

  it("moves backward on ArrowLeft/ArrowUp, wrapping past BASIC back to MAX", () => {
    expect(resolveNextPlanOnArrowKey("ArrowLeft", "PRO")).toBe("BASIC");
    expect(resolveNextPlanOnArrowKey("ArrowUp", "BASIC")).toBe("MAX");
  });

  it("returns null for any other key", () => {
    expect(resolveNextPlanOnArrowKey("Enter", "BASIC")).toBeNull();
    expect(resolveNextPlanOnArrowKey("Tab", "PRO")).toBeNull();
  });
});
