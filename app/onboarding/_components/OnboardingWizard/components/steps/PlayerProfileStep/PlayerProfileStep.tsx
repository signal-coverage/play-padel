import { useEffect, useRef } from "react";
import { Mail, Phone } from "lucide-react";
import { Controller } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDER_OPTIONS, PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
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
          Tell us a bit about yourself.
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

      <Field>
        <FieldLabel htmlFor="padelCategory">Padel category</FieldLabel>
        <FieldDescription>
          Your skill-level ranking — Category 1 is the highest level, Category 8
          is a beginner.
        </FieldDescription>
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
    </>
  );
}
