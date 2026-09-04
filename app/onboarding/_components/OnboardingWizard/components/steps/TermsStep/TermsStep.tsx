import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { MutedPanel } from "@/components/MutedPanel";
import { TERMS_AND_CONDITIONS_TEXT } from "@/app/onboarding/terms-content";
import type { TermsStepProps } from "./types";

export function TermsStep({
  control,
  errors,
  shouldFocusHeading,
}: TermsStepProps) {
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
          Terms and Conditions
        </h2>
        <p className="text-sm text-muted-foreground">
          Please review and accept before continuing.
        </p>
      </div>

      <MutedPanel
        bordered
        size="md"
        className="max-h-56 overflow-y-auto text-xs text-muted-foreground leading-relaxed whitespace-pre-line"
      >
        {TERMS_AND_CONDITIONS_TEXT}
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
              I <b>confirm I am 18 years of age or older.</b>
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
              I <b>agree</b> to the <b>Terms and Conditions.</b>
            </Label>
          </div>
        )}
      />
      <FieldError errors={[errors.acceptedTerms]} />
    </>
  );
}
