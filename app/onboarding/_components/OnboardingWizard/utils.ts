import { Country } from "country-state-city";
import { normalizePhoneCode } from "./components/shared/countries";

// Detects a country from a phone number's leading calling code (e.g. "+54"
// -> Argentina), reusing country-state-city's own phonecode data instead of
// a separate phone-parsing dependency. Tries the longest prefix first
// (calling codes range 1-4 digits) so a shorter code can't match before
// enough digits have actually been typed. Returns the country's display
// name, matching how the "country" field is stored elsewhere in this form
// — or null if nothing recognizable has been typed yet.
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
