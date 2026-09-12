"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";

type TimeInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const MINUTE_STEPS = ["00", "15", "30", "45"];

function parseTimeParts(value: string): { hours: string; minutes: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { hours: "00", minutes: "00" };
  const [, hours, minutes] = match;
  return { hours, minutes };
}

/**
 * Native `<input type="time">` delegates AM/PM vs 24h formatting to the
 * browser, which on Windows Chrome follows the OS regional format and
 * ignores the element's `lang` attribute. This masked text input always
 * renders and emits "HH:mm" in 24h, independent of locale, and pairs it
 * with a 24h scrollable hour/minute picker for pointer-driven selection.
 */
function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
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

  function commitDraft() {
    const digits = draft.replace(/\D/g, "");
    if (digits.length === 0) {
      setDraft(value);
      return;
    }

    let hours: number;
    let minutes: number;
    if (digits.length <= 2) {
      hours = Number(digits);
      minutes = 0;
    } else if (digits.length === 3) {
      hours = Number(digits.slice(0, 1));
      minutes = Number(digits.slice(1));
    } else {
      hours = Number(digits.slice(0, 2));
      minutes = Number(digits.slice(2, 4));
    }

    if (hours <= 23 && minutes <= 59) {
      const formatted = `${String(hours).padStart(2, "0")}:${String(
        minutes,
      ).padStart(2, "0")}`;
      setDraft(formatted);
      onChange(formatted);
    } else {
      setDraft(value);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    }
  }

  const { hours: currentHour, minutes: currentMinute } = parseTimeParts(value);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        maxLength={5}
        value={draft}
        onChange={handleChange}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
        className={cn("pr-9", className)}
        {...props}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open time picker"
            className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Clock className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2.5">
          <div className="flex gap-2.5">
            <div className="flex max-h-56 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => onChange(`${hour}:${currentMinute}`)}
                  className={cn(
                    "rounded-sm px-2 py-1 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    hour === currentHour && "bg-accent text-accent-foreground",
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>
            <Separator orientation="vertical" />
            <div className="flex max-h-56 flex-col overflow-y-auto">
              {MINUTE_STEPS.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => onChange(`${currentHour}:${minute}`)}
                  className={cn(
                    "rounded-sm px-2 py-1 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    minute === currentMinute &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  {minute}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { TimeInput };
