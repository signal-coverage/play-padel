// Fixed two-step flow for this drawer — unlike OnboardingWizard's
// StepIndicator (which drives an 8-step, two-flow wizard off a configurable
// `flow` array), this one only ever has these two steps, so they're
// hardcoded rather than threaded through as a prop.
export const PAYMENT_STEP_LABELS = ["Email", "Card"] as const;
