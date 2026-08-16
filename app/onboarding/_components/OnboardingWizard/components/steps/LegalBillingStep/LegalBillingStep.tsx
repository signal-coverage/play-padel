import { useEffect, useRef } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LegalBillingStepProps } from "./types";
import { formatTaxId } from "./utils";

export function LegalBillingStep({
  register,
  errors,
  shouldFocusHeading,
}: LegalBillingStepProps) {
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
