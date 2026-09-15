import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PLAN_DETAILS,
  PLAN_EMPHASIS,
  PLAN_ICONS,
  formatCurrency,
} from "../../consts";
import type { PricingCardProps } from "./types";

// One tier tile in the marketing landing page's static pricing grid.
// Visual language borrows PLAN_EMPHASIS the same way
// PaymentActivationScreen's PlanOptionCard does (border/shadow/wash/icon
// escalation built from --primary only, never a per-tier hue) — but this
// card has no selection state, so it always renders at full emphasis
// instead of switching between a "selected" and a muted variant.
export function PricingCard({ plan }: PricingCardProps) {
  const t = useTranslations("LandingPricing");
  const details = PLAN_DETAILS[plan];
  const emphasis = PLAN_EMPHASIS[plan];
  const Icon = PLAN_ICONS[plan];
  const hasFixedPrice = details.monthlyPrice !== null;

  return (
    <div
      className={`relative flex flex-col gap-4 overflow-hidden rounded-sm border bg-background p-6 ${emphasis.cardBorder} ${emphasis.cardShadow} ${emphasis.ring ?? ""}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${emphasis.wash}`}
      />

      <div className="relative flex flex-col gap-4">
        <div
          className={`flex size-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/70 text-primary-foreground ${emphasis.iconShadow}`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </div>

        <div>
          {/* h3: nested under LandingPricing's own h2 ("Simple, Transparent
              Pricing") — each tier is a genuine subsection of that heading,
              not just styled text, so a heading tag is the correct
              (and SEO-relevant) semantic here rather than a <p>. */}
          <h3 className="text-lg font-bold text-foreground">{plan}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {details.tagline}
          </p>
        </div>

        <div>
          {hasFixedPrice ? (
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(details.monthlyPrice as number)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {t("perMonth")}
              </span>
            </p>
          ) : (
            <p className="text-3xl font-bold text-foreground">
              {details.priceNote}
            </p>
          )}
        </div>

        <div className="border-t border-border" />

        <ul className="flex flex-col gap-2.5">
          {details.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check aria-hidden="true" className="size-3" />
              </span>
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
