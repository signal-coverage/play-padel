import type { StepFormProps } from "../../../types";

export type ProfileStepProps = Pick<
  StepFormProps,
  "register" | "errors" | "shouldFocusHeading"
> & {
  clubName: string;
  email: string;
  phone: string;
  legalName: string;
  taxId: string;
  timezoneLabel: string;
  currencyLabel: string;
  courtRangeLabel: string;
};
