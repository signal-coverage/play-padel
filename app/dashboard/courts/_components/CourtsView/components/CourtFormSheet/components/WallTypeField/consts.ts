// Display labels come from the "WallTypeField" translation namespace (see
// WallTypeField.tsx) since this plain consts module can't call
// useTranslations itself.
export const COURT_WALL_TYPE_OPTIONS = [
  { value: "blindex", labelKey: "blindex" },
  { value: "concrete", labelKey: "concrete" },
  { value: "mixed", labelKey: "mixed" },
] as const;
