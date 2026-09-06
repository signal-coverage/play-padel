import { Country } from "country-state-city";

// Single source of country data for any form field that needs it — shared by
// CountryProvinceCityFields (country/province/city cascade) and PhoneField
// (calling-code picker), so both stay in sync without each keeping its own
// copy. Static for the lifetime of the app — computed once rather than per
// render.
export const ALL_COUNTRIES = Country.getAllCountries();

// country-state-city's `phonecode` field isn't always a clean digit string —
// ~26 entries (Bahamas, Dominican Republic, Guernsey, and other territories
// that share a larger country's international dialing prefix) store it with
// a leading "+" and/or a compound regional code, e.g. "+1-242" or
// "+1-809 and 1-829". The actual calling-code prefix is always the leading
// digit run; anything after a "-" is a regional/area code, not part of the
// international prefix. This is a no-op for the ~170 normally-formatted
// entries (e.g. Argentina "54").
export function normalizePhoneCode(rawPhoneCode: string): string {
  return rawPhoneCode.match(/\d+/)?.[0] ?? rawPhoneCode;
}
