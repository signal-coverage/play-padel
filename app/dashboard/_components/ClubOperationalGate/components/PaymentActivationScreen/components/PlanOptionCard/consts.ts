// Plan pricing/marketing data lives in lib/consts/planPricing.ts, shared
// with PlanStep/components/PlanPricingCard (the onboarding flow's version
// of this same visual language) so the real pricing data never drifts
// between the two. Re-exported here so this component keeps importing from
// a local, folder-scoped path per the SRP-per-folder convention, instead of
// reaching into lib/consts directly from the .tsx.
export {
  PLAN_ICONS,
  PLAN_EMPHASIS,
  PLAN_DETAILS,
} from "@/lib/consts/planPricing";
