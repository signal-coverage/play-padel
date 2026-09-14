// Fixed four-step flow for this modal, same reasoning as
// PaymentStepIndicator's own PAYMENT_STEP_LABELS: it never has more than
// these steps, so they're hardcoded rather than threaded through as a prop.
// Split from the original two (Details/Availability) so each step fits
// without its own vertical scroll: Details is now just name+photo,
// Attributes holds every physical characteristic, Pricing is its own step,
// and Availability is unchanged.
// `id` is a stable, never-translated key (used for `data-step` and React
// keys); the displayed label comes from the "CourtFormStepIndicator"
// translation namespace via `labelKey` (see CourtFormStepIndicator.tsx) —
// this plain consts module can't call useTranslations itself.
export const COURT_FORM_STEPS = [
  { id: "details", labelKey: "details" },
  { id: "attributes", labelKey: "attributes" },
  { id: "pricing", labelKey: "pricing" },
  { id: "availability", labelKey: "availability" },
] as const;
