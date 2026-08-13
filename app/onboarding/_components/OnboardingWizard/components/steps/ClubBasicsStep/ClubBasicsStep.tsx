import { useEffect, useRef } from "react";
import { Building2, Mail, Phone } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ClubBasicsStepProps } from "./types";

export function ClubBasicsStep({
  register,
  errors,
  shouldFocusHeading,
}: ClubBasicsStepProps) {
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
          Tell us about your club
        </h2>
        <p className="text-sm text-muted-foreground">
          Primary contact information players will see.
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

      <Field>
        <FieldLabel htmlFor="phone">Phone *</FieldLabel>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="phone"
            className="pl-9"
            placeholder="+54 11 1234-5678"
            {...register("phone")}
            aria-invalid={!!errors.phone}
          />
        </div>
        <FieldError errors={[errors.phone]} />
      </Field>
    </>
  );
}
