import { useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/SelectField";
import { GENDER_VALUES, type Gender } from "@/app/onboarding/types";
import { useCountryProvinceCityFields } from "@/components/CountryProvinceCityFields";
import { PhoneField } from "@/components/PhoneField";
import type { PlayerProfileStepProps } from "./types";

// Maps each Gender value to its translation key under
// "OnboardingWizard.steps.playerProfile.genderOptions" — built locally
// (rather than translating the exported GENDER_OPTIONS constant in
// app/onboarding/types.ts) since that file defines a plain module-level
// array and can't call useTranslations.
const GENDER_LABEL_KEYS: Record<Gender, string> = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "preferNotToSay",
};

export function PlayerProfileStep({
  register,
  control,
  errors,
  shouldFocusHeading,
}: PlayerProfileStepProps) {
  const t = useTranslations("OnboardingWizard.steps.playerProfile");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const genderOptions: { value: Gender; label: string }[] = GENDER_VALUES.map(
    (value) => ({
      value,
      label: t(`genderOptions.${GENDER_LABEL_KEYS[value]}`),
    }),
  );

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  const { countryField, provinceField, cityField } =
    useCountryProvinceCityFields({ control, errors });

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
        <FieldLabel htmlFor="firstName">{t("firstName")}</FieldLabel>
        <Input
          id="firstName"
          {...register("firstName")}
          aria-invalid={!!errors.firstName}
        />
        <FieldError errors={[errors.firstName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="lastName">{t("lastName")}</FieldLabel>
        <Input
          id="lastName"
          {...register("lastName")}
          aria-invalid={!!errors.lastName}
        />
        <FieldError errors={[errors.lastName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            className="pl-9"
            placeholder={t("emailPlaceholder")}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
        </div>
        <FieldError errors={[errors.email]} />
      </Field>

      <SelectField
        control={control}
        name="gender"
        label={t("gender")}
        placeholder={t("genderPlaceholder")}
        options={genderOptions}
        error={errors.gender}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <PhoneField control={control} errors={errors} />
        </div>
        <div className="flex-1">{countryField}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">{provinceField}</div>
        <div className="flex-1">{cityField}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor="zipCode">{t("zipCode")}</FieldLabel>
            <Input
              id="zipCode"
              placeholder={t("zipCodePlaceholder")}
              {...register("zipCode")}
              aria-invalid={!!errors.zipCode}
            />
            <FieldError errors={[errors.zipCode]} />
          </Field>
        </div>
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor="address">{t("address")}</FieldLabel>
            <Input
              id="address"
              placeholder={t("addressPlaceholder")}
              {...register("address")}
              aria-invalid={!!errors.address}
            />
            <FieldError errors={[errors.address]} />
          </Field>
        </div>
      </div>
    </>
  );
}
