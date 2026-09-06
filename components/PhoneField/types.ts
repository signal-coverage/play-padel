import type { Control, FieldErrors, FieldValues } from "react-hook-form";

// Minimal field shape PhoneField needs from the host form: it writes to both
// "phone" (the compound "+<dial code> <rest>" value) and "country" (kept in
// sync with whichever calling code is picked) — the same "country" field
// CountryProvinceCityFields reads/writes, so the two coexist on one form
// without stepping on each other. Any host form's values type only needs to
// be a superset of this shape.
export type PhoneFieldValues = {
  phone: string;
  country: string;
};

export type PhoneFieldProps<
  TFieldValues extends FieldValues = PhoneFieldValues,
> = {
  control: Control<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
};
