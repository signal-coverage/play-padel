import { useEffect, useRef } from "react";
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
import { CURRENCIES, TIMEZONES } from "@/lib/consts";
import type { LegalBillingStepProps } from "./types";

export function LegalBillingStep({
  register,
  control,
  errors,
  shouldFocusHeading,
}: LegalBillingStepProps) {
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
          Legal & billing
        </h2>
        <p className="text-sm text-muted-foreground">
          Used for invoices and tax documents.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="legalName">Legal name *</FieldLabel>
        <Input
          id="legalName"
          placeholder="Riverside Padel Club S.A."
          {...register("legalName")}
          aria-invalid={!!errors.legalName}
        />
        <FieldError errors={[errors.legalName]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="taxId">Tax ID / CUIT *</FieldLabel>
        <Input
          id="taxId"
          placeholder="30-12345678-9"
          {...register("taxId")}
          aria-invalid={!!errors.taxId}
        />
        <FieldError errors={[errors.taxId]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="timezone">Timezone *</FieldLabel>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.timezone]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="currency">Currency *</FieldLabel>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.currency]} />
      </Field>
    </>
  );
}
