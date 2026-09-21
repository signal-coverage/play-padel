// AdminTournamentsView takes no props of its own — same shape as
// AdminClubSettingsView, which it mirrors (picker + detail panel). Kept as
// an explicit type (not simply omitted) per this repo's SRP-per-folder
// convention of always having a types.ts alongside the component.
export type AdminTournamentsViewProps = Record<string, never>;
