// Ordered to match an owner's real lifecycle: set up the club, clear the
// gate that unlocks the dashboard, then day-to-day operation (courts,
// reservations, settings, tournaments).
export const OWNER_HELP_ITEM_KEYS = [
  "onboarding",
  "gate",
  "courts",
  "reservations",
  "clubSettings",
  "tournaments",
] as const;

// Maps each item's translated body to the nav destination(s) it should link
// to, keyed by the placeholder tag name used in that item's message (e.g.
// "<link>...</link>" or, for an item referencing two destinations,
// "<courtsLink>...</courtsLink>"/"<settingsLink>...</settingsLink>"). Only
// items whose body text names a real, directly reachable route are listed
// here — "gate" and "tournaments" reference a tab or a page with no
// discoverable nav entry, so they stay plain text.
export const OWNER_HELP_ITEM_LINKS: Partial<
  Record<(typeof OWNER_HELP_ITEM_KEYS)[number], Record<string, string>>
> = {
  onboarding: { link: "/dashboard/settings/club" },
  courts: {
    courtsLink: "/dashboard/courts",
    settingsLink: "/dashboard/settings/club",
  },
  reservations: { link: "/dashboard/reservations" },
  clubSettings: { link: "/dashboard/settings/club" },
};
