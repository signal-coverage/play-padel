import { useEffect, useRef } from "react";
import { Building2, Mail } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCountryProvinceCityFields } from "@/components/CountryProvinceCityFields";
import { PhoneField } from "@/components/PhoneField";
import type { ClubBasicsStepProps } from "./types";

export function ClubBasicsStep({
  register,
  control,
  errors,
  shouldFocusHeading,
}: ClubBasicsStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

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
          Tell us about your club
        </h2>
        <p className="text-sm text-muted-foreground">
          Primary contact information and location players will see.
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor="name">Club name *</FieldLabel>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name"
            className="pl-9"
            placeholder="Riverside Padel Club"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
        </div>
        <FieldError errors={[errors.name]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Contact email *</FieldLabel>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            className="pl-9"
            placeholder="contact@riversidepadel.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
        </div>
        <FieldError errors={[errors.email]} />
      </Field>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <PhoneField control={control} errors={errors} />
        </div>
        <div className="flex-1">{countryField}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <PhoneField
            control={control}
            errors={errors}
            phoneFieldName="whatsappNumber"
            countryFieldName="whatsappCountry"
            label="WhatsApp (for payment receipts) *"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">{provinceField}</div>
        <div className="flex-1">{cityField}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor="zipCode">Zip code</FieldLabel>
            <Input
              id="zipCode"
              placeholder="1642"
              {...register("zipCode")}
              aria-invalid={!!errors.zipCode}
            />
            <FieldError errors={[errors.zipCode]} />
          </Field>
        </div>
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor="address">Address *</FieldLabel>
            <Input
              id="address"
              placeholder="Av. Corrientes 1234"
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
