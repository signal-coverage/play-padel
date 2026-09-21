import { z } from "zod";
import {
  MAX_PADEL_CATEGORY_LEVEL,
  MIN_PADEL_CATEGORY_LEVEL,
} from "@/core/tournaments/consts";
import type { CategoryFormValues, CreateTournamentFormValues } from "./types";

// Every user-facing validation message lives in messages/es.json's
// "CreateTournamentSheetValidation" namespace, not as a literal here — same
// factory pattern as CourtFormSheet/consts.ts's buildCourtFormSchema.
export type CreateTournamentValidationT = (key: string) => string;

// Mirrors core/tournaments/schemas/tournament.schema.ts's
// createTournamentSchema/createTournamentCategorySchema shape exactly — that
// server-side schema remains the source of truth; this only drives inline
// field validation in the Sheet.
export function buildCreateTournamentFormSchema(
  t: CreateTournamentValidationT,
) {
  const categoryLevelSchema = z
    .number()
    .int()
    .min(MIN_PADEL_CATEGORY_LEVEL, t("categoryLevelOutOfRange"))
    .max(MAX_PADEL_CATEGORY_LEVEL, t("categoryLevelOutOfRange"));

  const categorySchema = z
    .object({
      name: z.string().min(1, t("categoryNameRequired")),
      groupCount: z
        .number({ message: t("groupCountRequired") })
        .int()
        .positive(t("groupCountMustBePositive")),
      advancesPerGroup: z
        .number({ message: t("advancesPerGroupRequired") })
        .int()
        .positive(t("advancesPerGroupMustBePositive")),
      minCategoryLevel: categoryLevelSchema.optional(),
      maxCategoryLevel: categoryLevelSchema.optional(),
      maxTeams: z
        .number()
        .int()
        .positive(t("maxTeamsMustBePositive"))
        .optional(),
    })
    .refine(
      (data) =>
        data.minCategoryLevel === undefined ||
        data.maxCategoryLevel === undefined ||
        data.minCategoryLevel <= data.maxCategoryLevel,
      {
        message: t("categoryLevelRangeInvalid"),
        path: ["maxCategoryLevel"],
      },
    );

  return z
    .object({
      name: z.string().min(1, t("nameRequired")),
      description: z.string().optional(),
      registrationOpensAt: z.string().min(1, t("registrationOpensAtRequired")),
      registrationClosesAt: z
        .string()
        .min(1, t("registrationClosesAtRequired")),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      categories: z
        .array(categorySchema)
        .min(1, t("atLeastOneCategoryRequired")),
    })
    .refine(
      (data) =>
        !data.registrationOpensAt ||
        !data.registrationClosesAt ||
        new Date(data.registrationClosesAt) >
          new Date(data.registrationOpensAt),
      {
        message: t("registrationCloseMustBeAfterOpen"),
        path: ["registrationClosesAt"],
      },
    )
    .refine(
      (data) => {
        if (!data.startDate || !data.endDate) return true;
        return new Date(data.endDate) >= new Date(data.startDate);
      },
      {
        message: t("endDateMustBeAfterStart"),
        path: ["endDate"],
      },
    );
}

export const DEFAULT_CATEGORY_VALUES: CategoryFormValues = {
  name: "",
  groupCount: 1,
  advancesPerGroup: 1,
};

// A brand-new tournament starts with exactly one category row already
// present — createTournamentSchema requires at least one and there's no way
// to add more after creation, so the Sheet should never open on an empty
// list that immediately fails validation for no visible reason.
export const DEFAULT_VALUES: CreateTournamentFormValues = {
  name: "",
  description: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  startDate: "",
  endDate: "",
  categories: [DEFAULT_CATEGORY_VALUES],
};
