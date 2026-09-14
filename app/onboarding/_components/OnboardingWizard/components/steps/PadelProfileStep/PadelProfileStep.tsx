import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectField } from "@/components/SelectField";
import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
} from "@/core/users/consts";
import type { PadelProfileStepProps } from "./types";

export function PadelProfileStep({
  control,
  errors,
  shouldFocusHeading,
}: PadelProfileStepProps) {
  const t = useTranslations("OnboardingWizard.steps.padelProfile");
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

      <Field>
        <FieldLabel htmlFor="padelCategory">{t("category")}</FieldLabel>
        <FieldDescription>{t("categoryDescription")}</FieldDescription>
        <Controller
          control={control}
          name="padelCategory"
          render={({ field }) => (
            <Select
              value={field.value ?? "unknown"}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="padelCategory">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADEL_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.padelCategory]} />
      </Field>

      <SelectField
        control={control}
        name="preferredSide"
        label={t("preferredSide")}
        placeholder={t("notSetYet")}
        options={PREFERRED_SIDE_OPTIONS}
        error={errors.preferredSide}
      />

      <SelectField
        control={control}
        name="dominantHand"
        label={t("dominantHand")}
        placeholder={t("notSetYet")}
        options={DOMINANT_HAND_OPTIONS}
        error={errors.dominantHand}
      />
    </>
  );
}
