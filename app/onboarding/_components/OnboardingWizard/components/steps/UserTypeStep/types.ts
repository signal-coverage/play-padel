import type { StepFormProps } from "../../../types";

export type UserTypeStepProps = Pick<
  StepFormProps,
  "control" | "errors" | "shouldFocusHeading"
>;
