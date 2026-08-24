// Plan pricing/marketing data moved to lib/consts/planPricing.ts — this is
// shared with app/dashboard/_components/ClubOperationalGate/components/
// PaymentActivationScreen, which also needs the exact same pricing data,
// so it must not be duplicated/drift. Re-exported here so this step's own
// components keep importing from a local, folder-scoped path.
export {
  PLAN_ICONS,
  PLAN_EMPHASIS,
  PLAN_DETAILS,
} from "@/lib/consts/planPricing";
export type { PlanEmphasis, PlanDetails } from "@/lib/consts/planPricing";
