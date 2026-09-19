import { describe, expect, it } from "vitest";
import { getInitials } from "./utils";

describe("getInitials", () => {
  it("returns the first and last initials in uppercase", () => {
    expect(getInitials("Nicolas Sanchez")).toBe("NS");
  });

  it("uses the outer words for multi-part names", () => {
    expect(getInitials("Maria del Carmen Lopez")).toBe("ML");
  });

  it("returns one uppercase initial for a single-word name", () => {
    expect(getInitials("padelero")).toBe("P");
  });

  it("normalizes surrounding and repeated whitespace", () => {
    expect(getInitials("  ana\t  perez  ")).toBe("AP");
  });

  it.each(["", "   ", "\t\n"])(
    "returns an empty string for a blank name %#",
    (name) => {
      expect(getInitials(name)).toBe("");
    },
  );
});
