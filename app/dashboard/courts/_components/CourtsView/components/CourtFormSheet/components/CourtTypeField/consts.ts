import { Sun, Warehouse } from "lucide-react";

// Display labels come from the "CourtLabels" translation namespace (see
// CourtTypeField.tsx) — the same indoor/outdoor keys used by
// courts/utils.ts's indoorLabel — since this plain consts module can't call
// useTranslations itself.
export const COURT_TYPE_OPTIONS = [
  { value: false, labelKey: "outdoor", Icon: Sun },
  { value: true, labelKey: "indoor", Icon: Warehouse },
] as const;
