import { useEffect, useRef } from "react";
import { User } from "lucide-react";
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
  courtRangeLabel,
  shouldFocusHeading,
}: ProfileStepProps) {
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
          Your profile
        </h2>
        <p className="text-sm text-muted-foreground">
          How your name appears inside Play Padel.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="displayName">Display name *</FieldLabel>
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
          Summary
        </p>
        <SummaryRow label="Club" value={clubName} />
        <SummaryRow label="Email" value={email} />
        <SummaryRow label="Phone" value={phone} />
        <SummaryRow label="Address" value={address} />
        <SummaryRow label="Country" value={country} />
        <SummaryRow label="Province" value={province} />
        <SummaryRow label="City" value={city} />
        <SummaryRow label="Zip code" value={zipCode} />
        <SummaryRow label="Legal name" value={legalName} />
        <SummaryRow label="Tax ID" value={taxId} />
        <SummaryRow label="Courts" value={courtRangeLabel} />
      </MutedPanel>
    </>
  );
}
