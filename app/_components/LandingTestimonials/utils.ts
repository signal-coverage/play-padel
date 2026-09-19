/**
 * Returns uppercase initials from the first and last whitespace-delimited
 * words. Single-word names yield one initial; blank names yield an empty
 * string.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
