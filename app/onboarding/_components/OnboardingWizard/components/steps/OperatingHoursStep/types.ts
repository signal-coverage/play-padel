import type { UseFormSetValue } from "react-hook-form";
import type { OnboardingFormValues } from "@/app/onboarding/types";
import type { StepFormProps } from "../../../types";

export type OperatingHoursRow = {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
};

export type OperatingHoursStepProps = Pick<
  StepFormProps,
  "control" | "errors" | "shouldFocusHeading"
> & {
  setValue: UseFormSetValue<OnboardingFormValues>;
};
