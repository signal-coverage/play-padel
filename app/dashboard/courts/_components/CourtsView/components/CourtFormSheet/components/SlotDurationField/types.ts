export type SlotDurationFieldProps = {
  id: string;
  value: number;
  onChange: (minutes: number) => void;
  ariaInvalid?: boolean;
};
