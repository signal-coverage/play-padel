import {
  AsYouType,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";

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
// (e.g. Argentina "011 15-2345-6789", US "(201) 555-0123") — the static
// "11 1234-5678" placeholder this used to show was Argentina-specific and
// misleading once every country shares this field, so there's nothing to
// show until a country is actually selected.
export function getPhonePlaceholder(
  countryIsoCode: string | undefined,
): string {
  if (!countryIsoCode) return "";
  const example = getExampleNumber(countryIsoCode as CountryCode, examples);
  return example?.formatNational() ?? "";
}
