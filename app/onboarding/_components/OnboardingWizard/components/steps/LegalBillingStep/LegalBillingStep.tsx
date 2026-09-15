import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LegalBillingStepProps } from "./types";
import { formatTaxId } from "./utils";

export function LegalBillingStep({
  register,
  errors,
  shouldFocusHeading,
}: LegalBillingStepProps) {
  const t = useTranslations("OnboardingWizard.steps.legalBilling");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const taxIdField = register("taxId");

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
        <p className="text-sm text-muted-foreground">{t("subheading")}</p>
      </div>

      <Field>
        <FieldLabel htmlFor="legalName">{t("legalName")}</FieldLabel>
        <Input
          id="legalName"
          placeholder={t("legalNamePlaceholder")}
          {...register("legalName")}
          aria-invalid={!!errors.legalName}
        />
        <FieldError errors={[errors.legalName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="taxId">{t("taxId")}</FieldLabel>
        <Input
          id="taxId"
          placeholder={t("taxIdPlaceholder")}
          {...taxIdField}
          onChange={(e) => {
            e.target.value = formatTaxId(e.target.value);
            taxIdField.onChange(e);
          }}
          aria-invalid={!!errors.taxId}
        />
        <FieldError errors={[errors.taxId]} />
      </Field>
    </>
  );
}
