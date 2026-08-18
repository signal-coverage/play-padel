export type ReservationFeeFieldProps = {
  id: string;
  value: number | undefined;
  onChange: (price: number | undefined) => void;
  ariaInvalid?: boolean;
};
