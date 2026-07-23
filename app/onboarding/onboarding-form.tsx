"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { completeOnboarding, type OnboardingFormState } from "./actions";

const initialState: OnboardingFormState = {};

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initialState
  );

  return (
    <form action={formAction} className="w-full max-w-sm">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="city">City</FieldLabel>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
          />
          <FieldDescription>
            Used for booking confirmations only.
          </FieldDescription>
        </Field>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Continue"}
        </Button>
      </FieldGroup>
    </form>
  );
}
