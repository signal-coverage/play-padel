import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates a plain name", () => {
    expect(slugify("Alpha Club")).toBe("alpha-club");
  });

  it("collapses a run of non-alphanumeric characters into one hyphen", () => {
    expect(slugify("Alpha   Club!!  --  2")).toBe("alpha-club-2");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Alpha Club--  ")).toBe("alpha-club");
  });

  it("keeps digits", () => {
    expect(slugify("Club 24/7")).toBe("club-24-7");
  });

  it("returns an empty string for a name with no alphanumeric characters", () => {
    expect(slugify("!!! ---")).toBe("");
  });
});
