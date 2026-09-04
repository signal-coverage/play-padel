export type ActivationStepIndicatorProps = {
  // Index into ACTIVATION_STEP_LABELS of the step currently showing. Never
  // clickable — unlike CourtFormSheet's step tabs, step 2 here is gated
  // behind a real precondition (a confirmed membership payment), not a
  // free navigation choice.
  current: 0 | 1;
};
