import type { OwnerCategorySummary } from "../../types";

export type CategoryWorkspaceProps = {
  tournamentId: string;
  category: OwnerCategorySummary;
  // Forwarded from TournamentsManager's own optional prop — see that
  // component's comment. Threaded into every hook call below.
  clubId?: string;
};
