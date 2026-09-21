import { describe, expect, it } from "vitest";
import {
  buildCreateTournamentFormSchema,
  DEFAULT_CATEGORY_VALUES,
  DEFAULT_VALUES,
} from "./consts";

// Minimal stand-in for next-intl's useTranslations() return value — just
// echoes the key, same fake-t convention already used by this repo's other
// buildXFormSchema tests (see CourtFormSheet/consts if it has one, or
// NewClosureForm's consts).
const t = (key: string) => key;

function baseValues() {
  return {
    name: "Summer Open",
    description: "",
    registrationOpensAt: "2026-10-01T10:00",
    registrationClosesAt: "2026-10-10T10:00",
    startDate: "",
    endDate: "",
    categories: [{ name: "Category A", groupCount: 2, advancesPerGroup: 1 }],
  };
}

describe("buildCreateTournamentFormSchema", () => {
  it("accepts a fully valid set of values", () => {
    const schema = buildCreateTournamentFormSchema(t);
    const result = schema.safeParse(baseValues());
    expect(result.success).toBe(true);
  });

  it("requires a name", () => {
    const schema = buildCreateTournamentFormSchema(t);
    const result = schema.safeParse({ ...baseValues(), name: "" });
    expect(result.success).toBe(false);
  });

  it("requires at least one category", () => {
    const schema = buildCreateTournamentFormSchema(t);
    const result = schema.safeParse({ ...baseValues(), categories: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a registration close date before the open date", () => {
    const schema = buildCreateTournamentFormSchema(t);
    const result = schema.safeParse({
      ...baseValues(),
      registrationOpensAt: "2026-10-10T10:00",
      registrationClosesAt: "2026-10-01T10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a category with a non-positive groupCount", () => {
    const schema = buildCreateTournamentFormSchema(t);
    const result = schema.safeParse({
      ...baseValues(),
      categories: [{ name: "Category A", groupCount: 0, advancesPerGroup: 1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("DEFAULT_VALUES", () => {
  it("starts with exactly one default category", () => {
    expect(DEFAULT_VALUES.categories).toEqual([DEFAULT_CATEGORY_VALUES]);
  });
});
