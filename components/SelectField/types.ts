import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

export type SelectFieldOption = {
  value: string;
  label: string;
};

export type SelectFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectFieldOption[];
  placeholder?: string;
  description?: ReactNode;
  error?: { message?: string };
  /** Defaults to `name` — override only if two SelectFields on the same page would otherwise collide on id. */
  id?: string;
};
