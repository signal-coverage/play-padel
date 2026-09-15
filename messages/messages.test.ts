import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

// Recursively collects every key path in a nested messages object, e.g.
// { LandingHero: { heading: { start: "..." } } } -> ["LandingHero.heading.start"].
// Arrays are walked positionally (index as path segment) so item shape
// (e.g. LandingFeatures.items[].title/description/imageAlt) is checked too.
function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectKeyPaths(item, `${prefix}[${index}]`),
    );
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nested]) =>
        collectKeyPaths(nested, prefix ? `${prefix}.${key}` : key),
    );
  }

  // Leaf value (string, number, etc.) — this path is a real message key.
  return [prefix];
}

describe("messages structural parity", () => {
  it("en.json and es.json expose the exact same set of message keys", () => {
    const enKeys = collectKeyPaths(en).sort();
    const esKeys = collectKeyPaths(es).sort();

    const missingInEs = enKeys.filter((key) => !esKeys.includes(key));
    const missingInEn = esKeys.filter((key) => !enKeys.includes(key));

    expect(
      missingInEs,
      "keys present in en.json but missing in es.json",
    ).toEqual([]);
    expect(
      missingInEn,
      "keys present in es.json but missing in en.json",
    ).toEqual([]);
    expect(esKeys).toEqual(enKeys);
  });
});
