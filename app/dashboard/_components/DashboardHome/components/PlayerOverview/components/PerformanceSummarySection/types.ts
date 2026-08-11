import type { PreferredSide } from "@/core/users/types";
import type { PerformanceSummary } from "../../types";

export type PerformanceSummarySectionProps = {
  performance: PerformanceSummary;
  // The real, editable preferred side (from PlayerStyleSection) — shown here
  // too so this card's "Position" badge can never contradict the one above
  // it. Not sourced from `performance`, which has no real position data.
  preferredSide: PreferredSide | null;
};
