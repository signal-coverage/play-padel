import { useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { Controller } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDER_OPTIONS } from "@/app/onboarding/types";
import { useCountryProvinceCityFields } from "../../shared/CountryProvinceCityFields";
import { PhoneField } from "../../shared/PhoneField";
import type { PlayerProfileStepProps } from "./types";

export function PlayerProfileStep({
  register,
  control,
  errors,
  shouldFocusHeading,
}: PlayerProfileStepProps) {
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
          Your profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about yourself and where you play.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="firstName">First name *</FieldLabel>
        <Input
          id="firstName"
          {...register("firstName")}
          aria-invalid={!!errors.firstName}
        />
        <FieldError errors={[errors.firstName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="lastName">Last name *</FieldLabel>
        <Input
          id="lastName"
          {...register("lastName")}
          aria-invalid={!!errors.lastName}
        />
        <FieldError errors={[errors.lastName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email *</FieldLabel>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            className="pl-9"
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
        </div>
        <FieldError errors={[errors.email]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="gender">Gender *</FieldLabel>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.gender]} />
      </Field>

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
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Input
              id="address"
              placeholder="Optional"
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
