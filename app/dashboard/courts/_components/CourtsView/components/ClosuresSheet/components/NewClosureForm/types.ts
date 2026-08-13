export type NewClosureFormValues = {
  startsAt: string;
  endsAt: string;
  reason: string;
  applyToAllCourts: boolean;
};

export type NewClosureFormProps = {
  onSubmit: (values: NewClosureFormValues) => Promise<boolean>;
  isSubmitting: boolean;
  showApplyToAllCourts: boolean;
};
