// Formats raw digits into Argentina's CUIT layout (XX-XXXXXXXX-X) as the
// user types, so the value always matches the field's placeholder shape.
export function formatTaxId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let result = digits.slice(0, 2);
  if (digits.length > 2) {
    result += `-${digits.slice(2, 10)}`;
  }
  if (digits.length > 10) {
    result += `-${digits.slice(10, 11)}`;
  }
  return result;
}
