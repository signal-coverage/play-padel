import { CalendarCheck, CreditCard, LayoutGrid } from "lucide-react";

export { ease } from "@/lib/consts/animation";

// One icon per feature, in the same order as messages/*.json's
// LandingFeatures.items (matched positionally) — title/description text
// lives in the translation messages.
export const FEATURE_ICONS = [CalendarCheck, CreditCard, LayoutGrid];
