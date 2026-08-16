import type { StepFormProps } from "../../../types";

export type ClubBasicsStepProps = Pick<
  StepFormProps,
  "register" | "control" | "errors" | "shouldFocusHeading"
>;
