"use client";

import { useEffect, useState } from "react";
import { useController } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import * as FlagIcons from "country-flag-icons/react/3x2";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/utils";
import { detectCountryFromPhone } from "../../../utils";
import { ALL_COUNTRIES, normalizePhoneCode } from "../countries";
import type { PhoneFieldProps } from "./types";
import { formatPhoneNumber, getPhonePlaceholder } from "./utils";

function dialCodeFor(isoCode: string | undefined): string {
  const country = ALL_COUNTRIES.find((c) => c.isoCode === isoCode);
  return country ? `+${normalizePhoneCode(country.phonecode)}` : "";
}

// Real flag SVGs instead of country-state-city's Unicode flag emoji — flag
// emoji rendering is unreliable across platforms (Windows in particular
// commonly falls back to showing the bare two-letter ISO code as plain text
// instead of an actual flag), so an emoji-only approach reads as "initials"
// rather than a flag for a large share of users.
function CountryFlag({ isoCode }: { isoCode: string | undefined }) {
  const Flag = isoCode
    ? FlagIcons[isoCode as keyof typeof FlagIcons]
    : undefined;
  if (!Flag) return null;
  return <Flag className="h-3.5 w-5 shrink-0 rounded-[2px]" />;
}

// Splits a combined "+XX rest of number" phone value into the matched
// country's ISO code and the remainder, reusing detectCountryFromPhone's
// calling-code matching so the split point lines up with a real country
// rather than an arbitrary prefix length. Returns the ISO code (not the raw
// dial code string) because several countries legitimately share the same
// calling code (US/Canada both "+1", Russia/Kazakhstan both "+7") — tracking
// identity instead of the string is what lets selection stay unambiguous.
// Returns countryIsoCode: undefined (no default) when nothing can be
// detected — the picker starts empty until the owner/player picks a code or
// a country, rather than assuming one.
function splitPhone(phone: string): {
  countryIsoCode: string | undefined;
  restOfNumber: string;
} {
  const matchedCountryName = detectCountryFromPhone(phone);
  const matchedCountry = matchedCountryName
    ? ALL_COUNTRIES.find((c) => c.name === matchedCountryName)
    : undefined;

  if (!matchedCountry) {
    return { countryIsoCode: undefined, restOfNumber: phone.trim() };
  }

  const dialCode = `+${normalizePhoneCode(matchedCountry.phonecode)}`;
  const trimmed = phone.trim();
  const restOfNumber = trimmed.startsWith(dialCode)
    ? trimmed.slice(dialCode.length).trimStart()
    : trimmed;

  return { countryIsoCode: matchedCountry.isoCode, restOfNumber };
}

// Compound phone field: a searchable calling-code combobox (writes to both
// "phone" and "country") paired with a plain input for the rest of the
// number. Replaces the plain phone Input previously used directly in
// ClubBasicsStep/PlayerProfileStep, and retires the separate
// phoneCountryStatus/PhoneCountryHint apparatus that used to announce the
// detected country several steps later — picking a calling code here sets
// the country immediately, in the same field.
//
// Selection is tracked by the country's ISO code, not by its dial-code
// string — several countries legitimately share a calling code (US/Canada
// both "+1", Russia/Kazakhstan both "+7"), so matching/selecting by the
// string alone can silently resolve to the wrong country.
export function PhoneField({ control, errors }: PhoneFieldProps) {
  const { field: phoneField } = useController({ control, name: "phone" });
  const { field: countryField } = useController({ control, name: "country" });

  const [countryIsoCode, setCountryIsoCode] = useState<string | undefined>(
    () => splitPhone(phoneField.value ?? "").countryIsoCode,
  );
  const [restOfNumber, setRestOfNumber] = useState<string>(
    () => splitPhone(phoneField.value ?? "").restOfNumber,
  );
  const [open, setOpen] = useState(false);

  const selectedCountry = ALL_COUNTRIES.find(
    (c) => c.isoCode === countryIsoCode,
  );
  const dialCode = dialCodeFor(countryIsoCode);

  // Keeps the calling-code picker in sync when "country" is set from
  // OUTSIDE this component — e.g. the owner/player picks a country directly
  // in the separate Country select on the same step instead of picking a
  // calling code here first. Without this, countryIsoCode would only ever
  // reflect what was set through this field's own picker.
  useEffect(() => {
    const matched = ALL_COUNTRIES.find((c) => c.name === countryField.value);
    if (matched?.isoCode !== countryIsoCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountryIsoCode(matched?.isoCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryField.value]);

  function handleSelectCountry(isoCode: string) {
    const country = ALL_COUNTRIES.find((c) => c.isoCode === isoCode);
    if (!country) return;

    // Re-format whatever digits are already typed to the newly-picked
    // country's own convention, rather than leaving them in the previous
    // country's (or no) format.
    const reformatted = formatPhoneNumber(restOfNumber, isoCode);
    setCountryIsoCode(isoCode);
    setRestOfNumber(reformatted);
    setOpen(false);
    const nextDialCode = `+${normalizePhoneCode(country.phonecode)}`;
    phoneField.onChange(`${nextDialCode} ${reformatted}`.trim());
    countryField.onChange(country.name);
  }

  function handleRestOfNumberChange(value: string) {
    const formatted = formatPhoneNumber(value, countryIsoCode);
    setRestOfNumber(formatted);
    phoneField.onChange(`${dialCode} ${formatted}`.trim());
  }

  return (
    <Field>
      <FieldLabel htmlFor="phone-rest">Phone *</FieldLabel>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={!!errors.phone}
              className="w-24 shrink-0 justify-between px-2.5 font-normal"
            >
              <span className="flex items-center gap-1.5 truncate">
                <CountryFlag isoCode={selectedCountry?.isoCode} />
                {dialCode || (
                  <span className="text-muted-foreground">Code</span>
                )}
              </span>
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country…" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {ALL_COUNTRIES.map((country) => {
                    const countryDialCode = `+${normalizePhoneCode(country.phonecode)}`;
                    return (
                      <CommandItem
                        key={country.isoCode}
                        value={`${country.name} ${countryDialCode}`}
                        onSelect={() => handleSelectCountry(country.isoCode)}
                      >
                        <Check
                          className={cn(
                            country.isoCode === countryIsoCode
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <CountryFlag isoCode={country.isoCode} />
                        {country.name} {countryDialCode}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Input
          id="phone-rest"
          className="flex-1"
          placeholder={getPhonePlaceholder(countryIsoCode)}
          value={restOfNumber}
          onChange={(e) => handleRestOfNumberChange(e.target.value)}
          aria-invalid={!!errors.phone}
        />
      </div>
      <FieldError errors={[errors.phone]} />
    </Field>
  );
}
