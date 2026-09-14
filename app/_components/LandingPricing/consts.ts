// Shared pricing data/consts re-exported the same way
// components/PlanSelectionModal/consts.ts re-exports PLAN_DETAILS — so this
// folder's .tsx only ever imports from its own local ./consts, never
// reaching past its folder boundary into lib/ or components/ directly (see
// that file's own comment for the full rationale).
export {
  PLAN_DETAILS,
  PLAN_ICONS,
  PLAN_EMPHASIS,
} from "@/lib/consts/planPricing";
export { PLAN_ORDER } from "@/components/PlanSelectionModal/consts";
export { formatCurrency } from "@/lib/utils/planPricing";
export { ease } from "@/lib/consts/animation";

// Section copy (heading/subheading/"per month" suffix) now lives in
// messages/*.json under the "LandingPricing" namespace.
