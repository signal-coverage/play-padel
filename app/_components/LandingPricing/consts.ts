// Shared pricing data/consts re-exported here so this folder only ever
// imports from its local ./consts rather than reaching past its folder
// boundary into lib/ or components/ directly (same SRP-per-folder
// convention as PricingCard's comment).
export {
  PLAN_DETAILS,
  PLAN_ICONS,
  PLAN_EMPHASIS,
} from "@/lib/consts/planPricing";
export { PLAN_ORDER } from "@/components/PlanSelectionModal/consts";
export { formatCurrency } from "@/lib/utils/planPricing";
export { ease } from "@/lib/consts/animation";
