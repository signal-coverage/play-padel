import type { Control, FieldErrors, FieldValues } from "react-hook-form";

// Minimal field shape CountryProvinceCityFields needs from the host form.
// "country" is the same field PhoneField's calling-code picker also writes
// to, so the two coexist on one form without stepping on each other. Any
// host form's values type only needs to be a superset of this shape.
export type CountryProvinceCityFieldsValues = {
  country: string;
  province: string;
  city: string;
};

export type CountryProvinceCityFieldsProps<
  TFieldValues extends FieldValues = CountryProvinceCityFieldsValues,
> = {
  control: Control<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
};
