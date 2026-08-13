import type { OnboardingStepKey } from "@/app/onboarding/types";

export type StepIndicatorProps = {
  flow: readonly OnboardingStepKey[];
  current: number;
};
