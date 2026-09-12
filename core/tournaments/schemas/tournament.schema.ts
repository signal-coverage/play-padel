import { z } from "zod";
import {
  MAX_PADEL_CATEGORY_LEVEL,
  MIN_PADEL_CATEGORY_LEVEL,
} from "@/core/tournaments/consts";

const categoryLevelSchema = z
  .number()
  .int()
  .min(
    MIN_PADEL_CATEGORY_LEVEL,
    `Category level must be at least ${MIN_PADEL_CATEGORY_LEVEL}`,
  )
  .max(
    MAX_PADEL_CATEGORY_LEVEL,
    `Category level must be at most ${MAX_PADEL_CATEGORY_LEVEL}`,
  );

export const createTournamentCategorySchema = z
  .object({
    name: z.string().min(1, "Category name is required"),
    groupCount: z.number().int().positive("Group count must be positive"),
    advancesPerGroup: z
      .number()
      .int()
      .positive("Advances per group must be positive"),
    minCategoryLevel: categoryLevelSchema.optional(),
    maxCategoryLevel: categoryLevelSchema.optional(),
    maxTeams: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.minCategoryLevel === undefined ||
      data.maxCategoryLevel === undefined ||
      data.minCategoryLevel <= data.maxCategoryLevel,
    {
      message:
        "minCategoryLevel must be less than or equal to maxCategoryLevel",
      path: ["maxCategoryLevel"],
    },
  );

export const createTournamentSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    registrationOpensAt: z
      .string()
      .min(1, "Registration open date is required"),
    registrationClosesAt: z
      .string()
      .min(1, "Registration close date is required"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    categories: z
      .array(createTournamentCategorySchema)
      .min(1, "At least one category is required"),
  })
  .refine(
    (data) =>
      new Date(data.registrationClosesAt) > new Date(data.registrationOpensAt),
    {
      message: "Registration close date must be after the open date",
      path: ["registrationClosesAt"],
    },
  )
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export const updateTournamentSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    registrationOpensAt: z.string().min(1).optional(),
    registrationClosesAt: z.string().min(1).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.registrationOpensAt || !data.registrationClosesAt) return true;
      return (
        new Date(data.registrationClosesAt) > new Date(data.registrationOpensAt)
      );
    },
    {
      message: "Registration close date must be after the open date",
      path: ["registrationClosesAt"],
    },
  )
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export const registerTeamSchema = z.object({
  partnerId: z.string().min(1, "Partner is required"),
});

// --- Slice 2 ("Owner group + scoring tools") schemas below ---

const manualGroupSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  teamIds: z
    .array(z.string().min(1))
    .min(1, "Each group needs at least one team"),
});

export const setGroupsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("manual"),
    groups: z.array(manualGroupSchema).min(1, "At least one group is required"),
  }),
  z.object({
    mode: z.literal("auto"),
  }),
]);

const matchSetInputSchema = z.object({
  setNumber: z.number().int().positive(),
  teamAGames: z.number().int().min(0),
  teamBGames: z.number().int().min(0),
});

export const enterMatchScoreSchema = z.object({
  sets: z
    .array(matchSetInputSchema)
    .min(1, "At least one set is required")
    .max(3, "A match is best-of-3 — at most 3 sets"),
});

export const recordWalkoverSchema = z.object({
  winningTeamId: z.string().min(1, "Winning team is required"),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;
export type SetGroupsInput = z.infer<typeof setGroupsSchema>;
export type EnterMatchScoreInput = z.infer<typeof enterMatchScoreSchema>;
export type RecordWalkoverInput = z.infer<typeof recordWalkoverSchema>;
