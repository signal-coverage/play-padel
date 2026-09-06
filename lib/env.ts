/**
 * Central home for required-environment-variable accessors. Consolidates the
 * identical `requireEnv`/`requireAppUrl` implementations that used to be
 * duplicated across `lib/mercadopago/oauth.ts`, `lib/mercadopago/
 * platformClient.ts`, `lib/mercadopago/preferences.ts`, and `lib/mercadopago/
 * platformPreferences.ts`.
 */

/** Reads `process.env[name]`, throwing a clear error if it's missing/empty. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/** Shorthand for `requireEnv("NEXT_PUBLIC_APP_URL")`. */
export function requireAppUrl(): string {
  return requireEnv("NEXT_PUBLIC_APP_URL");
}
