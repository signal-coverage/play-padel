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

  // The country field can now also be set from OUTSIDE this hook — either
  // PhoneField's calling-code picker (country ONLY, province/city genuinely
  // go stale and must clear), or a host form's own reset() re-seeding
  // country/province/city TOGETHER from freshly-fetched data (e.g.
  // ClubSettingsView.tsx's re-seed effect once the club query resolves —
  // province/city are still correct and must NOT be cleared). The lazy
  // useState initializer above only re-hydrates countryIsoCode once, on
  // mount, so a LATER external write (after mount) would otherwise leave
  // countryIsoCode stale — silently breaking the province/city cascade for
  // whatever country got set. This effect re-derives countryIsoCode whenever
  // the RHF country value no longer matches what countryIsoCode currently
  // represents.
  //
  // Rather than unconditionally clearing province/city (the previous, buggy
  // behavior — see this file's own test for the exact regression), it
  // re-derives stateIsoCode from whatever the RHF province value ALREADY is
  // at that moment. A same-update reset() has already landed the real
  // province by the time this effect runs, so it resolves and survives
  // untouched; a genuinely stale province (PhoneField's country-only change)
  // simply won't match any of the new country's states, so stateIsoCode ends
  // up undefined — same end result as clearing, without an explicit
  // .onChange("") that would stomp on a sibling field mid-reset. City is
  // never touched directly either: once stateIsoCode resolves, the `cities`
  // list recomputes and the Select's own controlled value (cityField.value,
  // untouched here) naturally shows selected/blank depending on whether it
  // matches — clearing it explicitly would be redundant at best and another
  // reset-clobbering hazard at worst.
  //
  // When the change originates from handleCountryChange/handleProvinceChange
  // themselves, this is a no-op: those handlers already synchronously keep
  // countryIsoCode/stateIsoCode in sync with the RHF value they just set, so
  // by the time this effect runs, everything is already in sync and the
  // early return fires.
  useEffect(() => {
    const currentName = countryIsoCode
      ? ALL_COUNTRIES.find((c) => c.isoCode === countryIsoCode)?.name
      : undefined;
    const currentCountryValue = countryField.value as string;
    if ((currentCountryValue || undefined) === currentName) return;

    const nextIsoCode = currentCountryValue
      ? ALL_COUNTRIES.find((c) => c.name === currentCountryValue)?.isoCode
      : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountryIsoCode(nextIsoCode);

    const nextStates = nextIsoCode ? State.getStatesOfCountry(nextIsoCode) : [];
    const currentProvinceValue = provinceField.value as string;
    setStateIsoCode(
      nextStates.find((s) => s.name === currentProvinceValue)?.isoCode,
    );
    // Only the RHF country value should retrigger this sync — countryIsoCode
    // itself is derived state written by this same effect/handleCountryChange,
    // and provinceField.value is read as of whenever this effect happens to
    // run (deliberately not a dependency — see the comment above).
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
