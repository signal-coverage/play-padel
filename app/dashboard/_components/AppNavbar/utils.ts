export function getInitials(email: string | null): string {
  return email?.split("@")[0]?.[0]?.toUpperCase() ?? "U";
}
