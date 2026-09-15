// Display labels come from the "NetTypeField" translation namespace (see
// NetTypeField.tsx) since this plain consts module can't call
// useTranslations itself.
export const COURT_NET_TYPE_OPTIONS = [
  { value: "standard", labelKey: "standard" },
  { value: "professional", labelKey: "professional" },
] as const;
