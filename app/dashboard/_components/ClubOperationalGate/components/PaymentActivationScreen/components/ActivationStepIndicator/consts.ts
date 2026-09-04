// Fixed two-step flow for this screen — mirrors MembershipCheckoutDrawer's
// own PaymentStepIndicator (same numbered-circle + connecting-line
// language), just with this screen's own two step labels. Kept as its own
// small copy rather than a shared generic component per this repo's
// established convention (see SurfaceField/WallTypeField/NetTypeField):
// duplicate a small presentational piece across features rather than thread
// labels through a shared one for only two consumers.
export const ACTIVATION_STEP_LABELS = ["Membership", "Payment method"] as const;
