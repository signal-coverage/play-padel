import type { Plan } from "@/core/clubs/types";

// Local projection of the GET/PATCH /api/clubs response — this folder only
// ever reads/writes the `plan` field. Per this repo's SRP-per-folder
// convention, local types aren't shared across component folders (only the
// query key in consts.ts is intentionally shared) — see
// ClubOperationalGate/types.ts's comment for the same reasoning, and
// ClubSettingsView/types.ts's ClubRecord for the sibling type this
// deliberately does not import.
export type ClubPlanResponse = {
  club: {
    plan: Plan;
  };
};
