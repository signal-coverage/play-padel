import { useEffect, useRef } from "react";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MutedPanel } from "@/components/MutedPanel";
import { SummaryRow } from "../../SummaryRow";
import type { ProfileStepProps } from "./types";

export function ProfileStep({
  register,
  errors,
  clubName,
  email,
  phone,
  legalName,
  taxId,
  address,
  country,
  province,
  city,
  zipCode,
  shouldFocusHeading,
}: ProfileStepProps) {
  const t = useTranslations("OnboardingWizard.steps.profile");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  return (
    <>
      <div>
        <h2
          ref={headingRef}
          className="text-base font-semibold mb-0.5"
          tabIndex={-1}
        >
          {t("heading")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("subheading", { brand: "Play Padel" })}
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="displayName">{t("displayName")}</FieldLabel>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="displayName"
            className="pl-9"
            {...register("displayName")}
            aria-invalid={!!errors.displayName}
          />
        </div>
        <FieldError errors={[errors.displayName]} />
      </Field>

      <MutedPanel bordered size="md" className="mt-2 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("summary.title")}
        </p>
        <SummaryRow label={t("summary.club")} value={clubName} />
        <SummaryRow label={t("summary.email")} value={email} />
        <SummaryRow label={t("summary.phone")} value={phone} />
        <SummaryRow label={t("summary.address")} value={address} />
        <SummaryRow label={t("summary.country")} value={country} />
        <SummaryRow label={t("summary.province")} value={province} />
        <SummaryRow label={t("summary.city")} value={city} />
        <SummaryRow label={t("summary.zipCode")} value={zipCode} />
        <SummaryRow label={t("summary.legalName")} value={legalName} />
        <SummaryRow label={t("summary.taxId")} value={taxId} />
      </MutedPanel>
    </>
  );
}
