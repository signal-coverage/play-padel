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
  address: string;
  country: string;
  province: string;
  city: string;
  zipCode: string;
  courtRangeLabel: string;
};
