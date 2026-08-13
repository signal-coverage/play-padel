import type { StepFormProps } from "../../../types";

export type PlanStepProps = Pick<
  StepFormProps,
  "control" | "errors" | "shouldFocusHeading"
>;
