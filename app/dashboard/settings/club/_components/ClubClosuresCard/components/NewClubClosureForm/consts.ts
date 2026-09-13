import { z } from "zod";
import type { NewClubClosureFormValues } from "./types";

export const DEFAULT_VALUES: NewClubClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
};

// Mirrors ../../../../../courts/_components/CourtsView/components/ClosuresSheet/components/NewClosureForm/consts.ts's
// newClosureFormSchema, minus the per-court-only applyToAllCourts field —
// this form always applies to every active court.
export const newClubClosureFormSchema = z
  .object({
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  })
  .refine((data) => new Date(data.endsAt) > new Date(), {
    message: "Closure must not be entirely in the past",
    path: ["endsAt"],
  });
