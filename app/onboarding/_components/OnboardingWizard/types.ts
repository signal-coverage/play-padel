import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type {
  OnboardingFormValues,
  OnboardingStepKey,
} from "@/app/onboarding/types";

export type { OnboardingStepKey };

// Shared contract for the step components rendered by OnboardingWizard.
// Each step picks only the subset of fields it actually needs.
export type StepFormProps = {
  register: UseFormRegister<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  // Whether this step, on mount, should move focus to its own <h2>. False
  // only for the very first step shown on initial wizard mount (so page load
  // doesn't steal focus past the visible <h1>); true for every step that
  // becomes active afterwards via Continue/Back.
  shouldFocusHeading: boolean;
};
