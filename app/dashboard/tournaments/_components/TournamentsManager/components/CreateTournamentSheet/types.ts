import type { CreateTournamentInput } from "@/core/tournaments/schemas/tournament.schema";

// Mirrors createTournamentCategorySchema's shape — the numeric fields are
// real `number`s here (never strings), same "setValueAs" convention as
// CourtFormSheet's optional numeric inputs (see this folder's consts.ts).
export type CategoryFormValues = {
  name: string;
  groupCount: number;
  advancesPerGroup: number;
  minCategoryLevel?: number;
  maxCategoryLevel?: number;
  maxTeams?: number;
};

// Mirrors createTournamentSchema's shape. Dates are kept as the raw
// datetime-local/date input strings while the form is open — utils.ts's
// formValuesToApiInput converts them to ISO strings (and drops empty
// optional fields) right before the API call.
export type CreateTournamentFormValues = {
  name: string;
  description?: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startDate?: string;
  endDate?: string;
  categories: CategoryFormValues[];
};

export type CreateTournamentSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTournamentInput) => Promise<void>;
  isSubmitting: boolean;
};
