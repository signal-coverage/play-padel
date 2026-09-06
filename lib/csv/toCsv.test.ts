import { describe, expect, it } from "vitest";
import { toCsv } from "./toCsv";

describe("toCsv", () => {
  it("returns an empty string for empty headers and rows", () => {
    expect(toCsv({ headers: [], rows: [] })).toBe("");
  });

  it("renders just the header line when there are no rows", () => {
    expect(toCsv({ headers: ["id", "name"], rows: [] })).toBe("id,name");
  });

  it("renders a normal multi-row table", () => {
    const csv = toCsv({
      headers: ["id", "name", "count"],
      rows: [
        ["1", "Alice", 3],
        ["2", "Bob", 5],
      ],
    });

    expect(csv).toBe("id,name,count\r\n1,Alice,3\r\n2,Bob,5");
  });

  it("wraps a value containing a comma in double quotes", () => {
    const csv = toCsv({
      headers: ["name"],
      rows: [["Smith, John"]],
    });

    expect(csv).toBe('name\r\n"Smith, John"');
  });

  it("wraps a value containing a double quote in double quotes and doubles the internal quote", () => {
    const csv = toCsv({
      headers: ["name"],
      rows: [['Say "hi"']],
    });

    expect(csv).toBe('name\r\n"Say ""hi"""');
  });

  it("wraps a value containing a newline in double quotes", () => {
    const csv = toCsv({
      headers: ["notes"],
      rows: [["line one\nline two"]],
    });

    expect(csv).toBe('notes\r\n"line one\nline two"');
  });

  it("renders null values as an empty cell", () => {
    const csv = toCsv({
      headers: ["id", "notes"],
      rows: [["1", null]],
    });

    expect(csv).toBe("id,notes\r\n1,");
  });
});
