"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type TimeInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Native `<input type="time">` delegates AM/PM vs 24h formatting to the
 * browser, which on Windows Chrome follows the OS regional format and
 * ignores the element's `lang` attribute. This masked text input always
 * renders and emits "HH:mm" in 24h, independent of locale.
 */
function TimeInput({ value, onChange, ...props }: TimeInputProps) {
  const [draft, setDraft] = React.useState(value);
  // Adjust state during render (React's documented alternative to an
  // effect for "reset state when a prop changes") instead of a
  // useEffect — same pattern PlanSelectionModal.tsx already uses to sync
  // local state from a prop/query value.
  const [syncedValue, setSyncedValue] = React.useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted =
      digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setDraft(formatted);

    if (digits.length === 4) {
      const hours = Number(digits.slice(0, 2));
      const minutes = Number(digits.slice(2, 4));
      if (hours <= 23 && minutes <= 59) {
        onChange(formatted);
      }
    }
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      maxLength={5}
      value={draft}
      onChange={handleChange}
      onBlur={() => setDraft(value)}
      {...props}
    />
  );
}

export { TimeInput };
