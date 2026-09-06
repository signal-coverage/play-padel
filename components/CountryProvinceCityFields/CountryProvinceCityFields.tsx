import { useEffect, useMemo, useState } from "react";
import { useController } from "react-hook-form";
import type { FieldErrors, FieldValues, Path } from "react-hook-form";
import { State, City } from "country-state-city";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_COUNTRIES } from "@/components/countries";
import type {
  CountryProvinceCityFieldsProps,
  CountryProvinceCityFieldsValues,
} from "./types";

// Cascading Country -> Province/State -> City picker, shared by any form
// that collects a location (originally built for the onboarding wizard's
// player and owner-flow club-basics steps; now also used by club settings).
// See country-state-city usage notes below.
//
// The cascading logic (and the country/province/city RHF wiring) is
// centralized in this hook so callers can compose the three fields into
// whatever grid layout they need — e.g. interleaved with Phone/Zip/Address —
// instead of always rendering them as one rigid stacked block.
export function useCountryProvinceCityFields<
  TFieldValues extends FieldValues = CountryProvinceCityFieldsValues,
>({ control, errors }: CountryProvinceCityFieldsProps<TFieldValues>) {
  const countryName = "country" as Path<TFieldValues>;
  const provinceName = "province" as Path<TFieldValues>;
  const cityName = "city" as Path<TFieldValues>;
  const { field: countryField } = useController({
    control,
    name: countryName,
  });
  const { field: provinceField } = useController({
    control,
    name: provinceName,
  });
  const { field: cityField } = useController({ control, name: cityName });
  const fieldErrors =
    errors as unknown as FieldErrors<CountryProvinceCityFieldsValues>;

  // The RHF value is the display name (what gets submitted); the ISO code is
  // only needed locally to filter the next dropdown down the cascade, so it
  // lives in component state rather than the form. Lazily derived from the
  // current RHF value so navigating back into this step (after having
  // already picked a location) re-hydrates the cascade instead of losing it.
  const [countryIsoCode, setCountryIsoCode] = useState<string | undefined>(
    () =>
      ALL_COUNTRIES.find((c) => c.name === (countryField.value as string))
        ?.isoCode,
  );

  const states = useMemo(
    () => (countryIsoCode ? State.getStatesOfCountry(countryIsoCode) : []),
    [countryIsoCode],
  );

  const [stateIsoCode, setStateIsoCode] = useState<string | undefined>(
    () =>
      states.find((s) => s.name === (provinceField.value as string))?.isoCode,
  );

  const cities = useMemo(
    () =>
      countryIsoCode && stateIsoCode
        ? City.getCitiesOfState(countryIsoCode, stateIsoCode)
        : [],
    [countryIsoCode, stateIsoCode],
  );

  function handleCountryChange(name: string) {
    const selected = ALL_COUNTRIES.find((c) => c.name === name);
    countryField.onChange(name);
    setCountryIsoCode(selected?.isoCode);
    // Cascading reset: a new country invalidates whatever province/city were
    // previously selected.
    setStateIsoCode(undefined);
    provinceField.onChange("");
    cityField.onChange("");
  }

  // The country field can now also be set from OUTSIDE this hook — the
  // PhoneField's calling-code picker writes to the same "country" RHF field
  // when the owner/player picks a dial code, since phone and location now
  // live on the same form. The lazy useState initializer above only
  // re-hydrates countryIsoCode once, on mount, so a LATER external write
  // (after mount) would otherwise leave countryIsoCode stale — silently
  // breaking the province/city cascade for whatever country got set. This
  // effect re-derives countryIsoCode whenever the RHF country value no
  // longer matches what countryIsoCode currently represents, resetting
  // province/city the same way handleCountryChange already does.
  //
  // When the change originates from handleCountryChange itself, this is a
  // no-op: that handler already synchronously sets both countryField's value
  // and countryIsoCode to match, so by the time this effect runs, the two
  // are already in sync and the early return fires.
  useEffect(() => {
    const currentName = countryIsoCode
      ? ALL_COUNTRIES.find((c) => c.isoCode === countryIsoCode)?.name
      : undefined;
    const currentCountryValue = countryField.value as string;
    if ((currentCountryValue || undefined) === currentName) return;

    const nextIsoCode = currentCountryValue
      ? ALL_COUNTRIES.find((c) => c.name === currentCountryValue)?.isoCode
      : undefined;
    // External sync: the RHF "country" value changed from outside this hook
    // (e.g. PhoneField's calling-code picker), so local cascade state must be
    // re-derived to match, same as the existing pattern in OnboardingWizard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountryIsoCode(nextIsoCode);
    setStateIsoCode(undefined);
    provinceField.onChange("");
    cityField.onChange("");
    // Only the RHF country value should retrigger this sync — countryIsoCode
    // itself is derived state written by this same effect/handleCountryChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryField.value]);

  function handleProvinceChange(name: string) {
    const selected = states.find((s) => s.name === name);
    provinceField.onChange(name);
    setStateIsoCode(selected?.isoCode);
    // Cascading reset: a new province invalidates whatever city was
    // previously selected.
    cityField.onChange("");
  }

  function handleCityChange(name: string) {
    cityField.onChange(name);
  }

  const provincePlaceholder = !countryIsoCode
    ? "Select a country first"
    : states.length === 0
      ? "No provinces available"
      : "Select a province";

  const cityPlaceholder = !stateIsoCode
    ? "Select a province first"
    : cities.length === 0
      ? "No cities available"
      : "Select a city";

  const countryFieldElement = (
    <Field key="country">
      <FieldLabel htmlFor="country">Country</FieldLabel>
      <Select
        // Always a defined string (never `undefined`) so this stays a
        // controlled Radix Select from the very first render — switching
        // from uncontrolled (`undefined`) to controlled after an async
        // re-seed (e.g. ClubSettingsView's post-fetch `reset()`) has been
        // observed to make Radix's Select re-fire onValueChange during the
        // mode switch, clobbering the just-seeded value back to "".
        value={(countryField.value as string) ?? ""}
        onValueChange={handleCountryChange}
      >
        <SelectTrigger id="country" aria-invalid={!!fieldErrors.country}>
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          {ALL_COUNTRIES.map((c) => (
            <SelectItem key={c.isoCode} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[fieldErrors.country]} />
    </Field>
  );

  const provinceFieldElement = (
    <Field key="province">
      <FieldLabel htmlFor="province">Province / State</FieldLabel>
      <Select
        value={(provinceField.value as string) ?? ""}
        onValueChange={handleProvinceChange}
        disabled={!countryIsoCode || states.length === 0}
      >
        <SelectTrigger id="province" aria-invalid={!!fieldErrors.province}>
          <SelectValue placeholder={provincePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {states.map((s) => (
            <SelectItem key={s.isoCode} value={s.name}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[fieldErrors.province]} />
    </Field>
  );

  const cityFieldElement = (
    <Field key="city">
      <FieldLabel htmlFor="city">City</FieldLabel>
      <Select
        value={(cityField.value as string) ?? ""}
        onValueChange={handleCityChange}
        disabled={!stateIsoCode || cities.length === 0}
      >
        <SelectTrigger id="city" aria-invalid={!!fieldErrors.city}>
          <SelectValue placeholder={cityPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[fieldErrors.city]} />
    </Field>
  );

  return {
    countryField: countryFieldElement,
    provinceField: provinceFieldElement,
    cityField: cityFieldElement,
  };
}

// Convenience wrapper for callers that just want the three fields stacked in
// a single column (the original layout). Callers that need to interleave
// these fields with others (Phone, Zip, Address) should use
// useCountryProvinceCityFields directly instead.
export function CountryProvinceCityFields<
  TFieldValues extends FieldValues = CountryProvinceCityFieldsValues,
>({ control, errors }: CountryProvinceCityFieldsProps<TFieldValues>) {
  const { countryField, provinceField, cityField } =
    useCountryProvinceCityFields({ control, errors });

  return (
    <>
      {countryField}
      {provinceField}
      {cityField}
    </>
  );
}
