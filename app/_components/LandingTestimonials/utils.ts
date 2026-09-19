// First letter of the first and last word in the name, e.g. "Martín Ibarra"
// -> "MI" — used for the avatar placeholder until real photos are added.
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
