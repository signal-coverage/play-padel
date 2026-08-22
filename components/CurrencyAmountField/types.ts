export type CurrencyAmountFieldProps = {
  id: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  ariaInvalid?: boolean;
};
