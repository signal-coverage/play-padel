"use client";

import { Controller } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectFieldProps } from "./types";

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  description,
  error,
  id,
}: SelectFieldProps<T>) {
  const fieldId = id ?? name;

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? undefined}
            onValueChange={field.onChange}
          >
            <SelectTrigger id={fieldId} aria-invalid={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}
