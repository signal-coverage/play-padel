// Mercado Pago's own brand blue — sampled live from mercadopago.com.ar's
// own buttons and logo (`rgb(52, 131, 250)`), not guessed or copied from
// memory. Used to frame the card form as an intentionally-branded
// third-party box (see MembershipCheckoutDrawer.tsx) rather than trying to
// make it blend into this app's own palette.
export const MP_BRAND_BLUE = "#3483fa";

// Same sliding-page transition as OnboardingWizard's own `stepVariants`
// (see app/onboarding/_components/OnboardingWizard/styles.ts) — the email
// → card switch is meant to read as that same kind of step-by-step "page",
// not the vertical height-reveal this drawer used before. `direction`
// (1 = forward, -1 = back) comes from framer-motion's `custom` prop.
export const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 24 : -24,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
  }),
};
