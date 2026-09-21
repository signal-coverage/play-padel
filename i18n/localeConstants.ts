// Pure constants/types only — zero runtime imports, safe to import from
// both Server and Client Components.
//
// The app is Spanish-only: Locale is narrowed to its single value so any
// code that previously branched on "en" vs "es" has nowhere left to branch.
// Kept as a named type (not a bare string literal at each call site) since
// several places — core/users/types's UserProfile.locale, this repo's
// notification/content rendering — still want a single, named source of
// truth for "the app's locale," even though it can currently only be "es".
export type Locale = "es";

export const DEFAULT_LOCALE: Locale = "es";
