import {
  Crown,
  LayoutGrid,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Plan } from "@/core/clubs/types";

// One icon per tier, escalating in visual weight — matches the option
// list's LayoutGrid for BASIC, then builds up toward MAX. FREE is the
// hidden admin-only testing tier (never shown to real customers — see
// PLAN_ORDER in components/PlanSelectionModal/consts.ts) and gets a
// distinct Wrench icon since it's not part of the real pricing ladder.
export const PLAN_ICONS: Record<Plan, LucideIcon> = {
  BASIC: LayoutGrid,
  PRO: Zap,
  PLUS: Sparkles,
  MAX: Crown,
  FREE: Wrench,
};

// Visual "richness" scale for PlanPricingCard, all built from the same
// --primary token at increasing intensity — never new hues per tier (this
// app is single-brand, see the earlier decision to reuse --primary instead
// of the reference design's per-tier rainbow palette). Border opacity, glow
// size/opacity, and icon-badge glow all step up together; MAX additionally
// gets a heavier border and an outer ring, since it's the one tier that
// should read as visibly more exclusive than "just another step up."
export type PlanEmphasis = {
  cardBorder: string;
  cardShadow: string;
  wash: string;
  iconShadow: string;
  ring?: string;
};

export const PLAN_EMPHASIS: Record<Plan, PlanEmphasis> = {
  BASIC: {
    cardBorder: "border-primary/15",
    cardShadow: "shadow-[0_0_24px_-18px_var(--color-primary)]",
    wash: "from-primary/8 via-primary/3 to-transparent",
    iconShadow: "shadow-[0_4px_12px_-6px_var(--color-primary)]",
  },
  PRO: {
    cardBorder: "border-primary/20",
    cardShadow: "shadow-[0_0_32px_-16px_var(--color-primary)]",
    wash: "from-primary/12 via-primary/4 to-transparent",
    iconShadow: "shadow-[0_6px_16px_-6px_var(--color-primary)]",
  },
  PLUS: {
    cardBorder: "border-primary/28",
    cardShadow: "shadow-[0_0_40px_-14px_var(--color-primary)]",
    wash: "from-primary/16 via-primary/6 to-transparent",
    iconShadow: "shadow-[0_8px_20px_-6px_var(--color-primary)]",
  },
  MAX: {
    cardBorder: "border-2 border-primary/40",
    cardShadow: "shadow-[0_0_56px_-12px_var(--color-primary)]",
    wash: "from-primary/22 via-primary/8 to-transparent",
    iconShadow: "shadow-[0_10px_24px_-6px_var(--color-primary)]",
    ring: "ring-1 ring-primary/25 ring-offset-2 ring-offset-background",
  },
  // Never actually rendered — FREE is never in PLAN_ORDER, so no real
  // pricing card ever reads this. Reuses BASIC's minimal emphasis since it
  // is purely dead-code-shaped scaffolding to satisfy Record<Plan, ...>.
  FREE: {
    cardBorder: "border-primary/15",
    cardShadow: "shadow-[0_0_24px_-18px_var(--color-primary)]",
    wash: "from-primary/8 via-primary/3 to-transparent",
    iconShadow: "shadow-[0_4px_12px_-6px_var(--color-primary)]",
  },
};

// Pricing/marketing details for each plan tier, shown by PlanOptionCard
// (dashboard payment-activation gate) and PlanSelectionModal. Plan tier is
// now chosen from the dashboard gate rather than at onboarding — this only
// holds the pricing/marketing copy, not the tier-selection logic. MAX has no
// fixed price (custom/enterprise), so its price and welcome-free-months
// fields are null and priceNote carries the "contact us" copy instead.
export type PlanDetails = {
  tagline: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  welcomeFreeMonths: number | null;
  priceNote?: string;
  features: string[];
};

// Court-count ceiling enforced at court-creation time (see
// core/courts/services/courts.service.ts's `createCourt`) — kept in sync
// with the "Up to N courts" line in each tier's `features` below. MAX has no
// entry: its limit is negotiated per client and lives only on
// `Club.courtLimit` (an admin-set override, never a fixed constant); with no
// override set it is treated as unlimited. FREE (the hidden testing tier)
// bypasses the check entirely via `isClubOnFreePlan`, regardless of
// `Club.plan`, so it has no entry either.
export const PLAN_COURT_LIMITS: Partial<Record<Plan, number>> = {
  BASIC: 2,
  PRO: 4,
  PLUS: 7,
};

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  BASIC: {
    tagline: "Perfect for clubs just getting started.",
    monthlyPrice: 30000,
    annualPrice: 300000,
    welcomeFreeMonths: 1,
    features: [
      "Up to 2 courts",
      "Online booking & reservations",
      "Mercado Pago payments",
      "Court schedule management",
    ],
  },
  PRO: {
    tagline: "For growing clubs that need more room to book.",
    monthlyPrice: 50000,
    annualPrice: 500000,
    welcomeFreeMonths: 3,
    features: [
      "Everything in Basic",
      "Up to 4 courts",
      "Player directory",
      "Audit log & activity history",
    ],
  },
  PLUS: {
    tagline: "Built for busy clubs running at full capacity.",
    monthlyPrice: 70000,
    annualPrice: 700000,
    welcomeFreeMonths: 6,
    features: [
      "Everything in Pro",
      "Up to 7 courts",
      "Priority support",
      "Advanced reporting",
    ],
  },
  MAX: {
    tagline: "Custom-built for large multi-court operations.",
    monthlyPrice: null,
    annualPrice: null,
    welcomeFreeMonths: null,
    priceNote: "Contact us",
    features: [
      "Everything in Plus",
      "Unlimited courts",
      "Dedicated account manager",
      "Custom integrations",
      "Enterprise support",
    ],
  },
  // Internal testing plan only — activated exclusively via the admin-only
  // `activateFreePlan` (core/billing/services/membership.service.ts) through
  // app/admin/club-status. Never rendered to a real customer since "FREE" is
  // deliberately excluded from PLAN_ORDER.
  FREE: {
    tagline: "Internal testing plan — not available to customers.",
    monthlyPrice: 0,
    annualPrice: 0,
    welcomeFreeMonths: null,
    features: [],
  },
};
