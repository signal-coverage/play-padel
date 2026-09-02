export type CourtFormStepIndicatorProps = {
  // Index into COURT_FORM_STEP_LABELS of the step currently showing.
  current: 0 | 1;
  onChange: (step: 0 | 1) => void;
};
