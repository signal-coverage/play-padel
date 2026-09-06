import {
  AsYouType,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { Country } from "country-state-city";
import { normalizePhoneCode } from "@/components/countries";

// Formats raw digits into the SELECTED country's own real national
// convention as the user types (e.g. Argentina "11 1234-5678", US
// "(212) 555-1234", Spain "612 34 56 78"), via libphonenumber-js's
// AsYouType — a fixed single-country mask (like LegalBillingStep's CUIT
// formatter) only makes sense for a field tied to one country; this one
// isn't, since the calling-code picker supports any country. Replays every
// digit through a fresh formatter each call (rather than keeping one
// instance alive across keystrokes) since a controlled input's onChange
// only ever hands back the current full value, not just the new character.
// Falls back to plain digits when no country is selected yet, or the code
// isn't one libphonenumber-js recognizes (verified: AsYouType accepts
// undefined/unrecognized codes without throwing, it just skips formatting).
export function formatPhoneNumber(
  value: string,
  countryIsoCode: string | undefined,
): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const formatter = new AsYouType(countryIsoCode as CountryCode | undefined);
  let result = digits;
  for (const digit of digits) {
    result = formatter.input(digit);
  }
  return result;
}

// A real example number for the selected country, nationally formatted
// (e.g. Argentina "011 15-2345-6789", US "(201) 555-0123") — shown only once
// a country is actually selected, since a static example for one country
// would be misleading once every country shares this field.
export function getPhonePlaceholder(
  countryIsoCode: string | undefined,
): string {
  if (!countryIsoCode) return "";
  const example = getExampleNumber(countryIsoCode as CountryCode, examples);
  return example?.formatNational() ?? "";
}

// Detects a country from a phone number's leading calling code (e.g. "+54"
// -> Argentina), reusing country-state-city's own phonecode data instead of
// a separate phone-parsing dependency. Tries the longest prefix first
// (calling codes range 1-4 digits) so a shorter code can't match before
// enough digits have actually been typed. Returns the country's display
// name, matching how the "country" field is stored on host forms — or null
// if nothing recognizable has been typed yet.
export function detectCountryFromPhone(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return null;
  const callingDigits = digits.slice(1);

  const countries = Country.getAllCountries();
  for (let length = 4; length >= 1; length--) {
    if (callingDigits.length < length) continue;
    const prefix = callingDigits.slice(0, length);
    const match = countries.find(
      (option) => normalizePhoneCode(option.phonecode) === prefix,
    );
    if (match) return match.name;
  }
  return null;
}
