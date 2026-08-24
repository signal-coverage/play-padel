// Pricing formatting helpers moved to lib/utils/planPricing.ts — shared
// with app/dashboard/_components/ClubOperationalGate/components/
// PaymentActivationScreen, which also needs this exact same pricing logic,
// so it must not be duplicated/drift. Re-exported here so this component
// keeps importing from a local, folder-scoped path.
export {
  formatCurrency,
  getAnnualMonthlyEquivalent,
  getSavingsMonths,
} from "@/lib/utils/planPricing";
