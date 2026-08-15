import { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
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
          Your padel style
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us how you play.
        </p>
      </div>

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

      <Field>
        <FieldLabel htmlFor="preferredSide">Preferred side</FieldLabel>
        <Controller
          control={control}
          name="preferredSide"
          render={({ field }) => (
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="preferredSide">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_SIDE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.preferredSide]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="dominantHand">Dominant hand</FieldLabel>
        <Controller
          control={control}
          name="dominantHand"
          render={({ field }) => (
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="dominantHand">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {DOMINANT_HAND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.dominantHand]} />
      </Field>
    </>
  );
}
