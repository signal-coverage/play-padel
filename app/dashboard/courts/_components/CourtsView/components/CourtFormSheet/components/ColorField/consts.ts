// Display labels come from the "ColorField" translation namespace (see
// ColorField.tsx) since this plain consts module can't call useTranslations
// itself.
export const COURT_COLOR_OPTIONS = [
  { value: "#2563EB", labelKey: "blue" },
  { value: "#2D8A60", labelKey: "green" },
  { value: "#B5651D", labelKey: "terracotta" },
  { value: "#18181B", labelKey: "black" },
  { value: "#D6336C", labelKey: "fuchsia" },
  { value: "#7C3AED", labelKey: "purple" },
] as const;
