import { describe, expect, it } from "vitest";
import { formValuesToApiInput } from "./utils";
import type { CreateTournamentFormValues } from "./types";

function baseValues(
  overrides: Partial<CreateTournamentFormValues> = {},
): CreateTournamentFormValues {
  return {
    name: "Summer Open",
    description: "",
    registrationOpensAt: "2026-10-01T10:00",
    registrationClosesAt: "2026-10-10T10:00",
    startDate: "",
    endDate: "",
    categories: [{ name: "Category A", groupCount: 2, advancesPerGroup: 1 }],
    ...overrides,
  };
}

describe("formValuesToApiInput", () => {
  it("converts registration dates to ISO strings", () => {
    const result = formValuesToApiInput(baseValues());

    expect(result.registrationOpensAt).toBe(
      new Date("2026-10-01T10:00").toISOString(),
    );
    expect(result.registrationClosesAt).toBe(
      new Date("2026-10-10T10:00").toISOString(),
    );
  });

  it("omits an empty description instead of sending an empty string", () => {
    const result = formValuesToApiInput(baseValues({ description: "" }));

    expect(result.description).toBeUndefined();
  });

  it("keeps a non-empty description", () => {
    const result = formValuesToApiInput(
      baseValues({ description: "A great tournament" }),
    );

    expect(result.description).toBe("A great tournament");
  });

  it("omits empty startDate/endDate instead of sending empty strings", () => {
    const result = formValuesToApiInput(
      baseValues({ startDate: "", endDate: "" }),
    );

    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it("converts non-empty startDate/endDate to ISO strings", () => {
    const result = formValuesToApiInput(
      baseValues({ startDate: "2026-11-01", endDate: "2026-11-05" }),
    );

    expect(result.startDate).toBe(new Date("2026-11-01").toISOString());
    expect(result.endDate).toBe(new Date("2026-11-05").toISOString());
  });

  it("passes categories through with their numeric fields intact", () => {
    const result = formValuesToApiInput(
      baseValues({
        categories: [
          {
            name: "Category A",
            groupCount: 3,
            advancesPerGroup: 2,
            minCategoryLevel: 2,
            maxCategoryLevel: 5,
            maxTeams: 16,
          },
        ],
      }),
    );

    expect(result.categories).toEqual([
      {
        name: "Category A",
        groupCount: 3,
        advancesPerGroup: 2,
        minCategoryLevel: 2,
        maxCategoryLevel: 5,
        maxTeams: 16,
      },
    ]);
  });
});
