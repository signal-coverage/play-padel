import { describe, expect, it } from "vitest";
import { resolveAutoRecurringFrequency } from "./membershipCycle";

describe("resolveAutoRecurringFrequency", () => {
  it.each([
    ["MONTHLY", 1],
    ["ANNUAL", 12],
  ] as const)(
    "maps %s memberships to a %i-month Mercado Pago recurrence",
    (cycle, frequency) => {
      expect(resolveAutoRecurringFrequency(cycle)).toEqual({
        frequency,
        frequency_type: "months",
      });
    },
  );
});
