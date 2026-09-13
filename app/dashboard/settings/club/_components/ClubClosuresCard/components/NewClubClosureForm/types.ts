export type NewClubClosureFormValues = {
  startsAt: string;
  endsAt: string;
  reason: string;
};

export type NewClubClosureFormProps = {
  onSubmit: (values: NewClubClosureFormValues) => Promise<boolean>;
  isSubmitting: boolean;
};
