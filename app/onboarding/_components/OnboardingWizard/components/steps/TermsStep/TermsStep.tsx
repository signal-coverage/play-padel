import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { MutedPanel } from "@/components/MutedPanel";
import type { TermsStepProps } from "./types";

export function TermsStep({
  control,
  errors,
  shouldFocusHeading,
}: TermsStepProps) {
  const t = useTranslations("OnboardingWizard.steps.terms");
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
        <p className="text-sm text-muted-foreground">{t("subheading")}</p>
      </div>

      <MutedPanel
        bordered
        size="md"
        className="max-h-56 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-line"
      >
        {t("content", { brand: "Play Padel" })}
      </MutedPanel>

      <Controller
        control={control}
        name="confirmedAge"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirmedAge"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <Label
              htmlFor="confirmedAge"
              className="text-sm font-normal leading-snug"
            >
              {t("confirmAge")}
            </Label>
          </div>
        )}
      />
      <FieldError errors={[errors.confirmedAge]} />

      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id="acceptedTerms"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <Label
              htmlFor="acceptedTerms"
              className="text-sm font-normal leading-snug"
            >
              {t("acceptTerms")}
            </Label>
          </div>
        )}
      />
      <FieldError errors={[errors.acceptedTerms]} />
    </>
  );
}
