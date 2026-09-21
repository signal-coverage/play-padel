import type { CreateTournamentInput } from "@/core/tournaments/schemas/tournament.schema";
import type { CreateTournamentFormValues } from "./types";

// Converts the form's raw datetime-local/date input strings into the ISO
// strings createTournamentSchema expects, and drops empty optional fields
// (description/startDate/endDate) instead of sending empty strings — same
// `new Date(value).toISOString()` conversion ClosuresSheet's handleCreate
// already uses for its own datetime-local inputs.
export function formValuesToApiInput(
  values: CreateTournamentFormValues,
): CreateTournamentInput {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description : undefined,
    registrationOpensAt: new Date(values.registrationOpensAt).toISOString(),
    registrationClosesAt: new Date(values.registrationClosesAt).toISOString(),
    startDate: values.startDate
      ? new Date(values.startDate).toISOString()
      : undefined,
    endDate: values.endDate
      ? new Date(values.endDate).toISOString()
      : undefined,
    categories: values.categories.map((category) => ({
      name: category.name,
      groupCount: category.groupCount,
      advancesPerGroup: category.advancesPerGroup,
      minCategoryLevel: category.minCategoryLevel,
      maxCategoryLevel: category.maxCategoryLevel,
      maxTeams: category.maxTeams,
    })),
  };
}
