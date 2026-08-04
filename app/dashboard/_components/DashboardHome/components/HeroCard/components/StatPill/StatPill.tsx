import { StatValue } from "@/components/StatValue";
import type { StatPillProps } from "./types";

/**
 * Thin domain-named wrapper around `StatValue`'s `pill` variant, kept so the
 * 6 hero call sites (`OwnerHero`/`PlayerHero`) read as `<StatPill .../>`
 * instead of repeating `variant="pill"` at every call site.
 */
export function StatPill({ label, value }: StatPillProps) {
  return <StatValue variant="pill" label={label} value={value} />;
}
