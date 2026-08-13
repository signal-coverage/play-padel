import { z } from "zod";
import type { NewClosureFormValues } from "./types";

export const DEFAULT_VALUES: NewClosureFormValues = {
  startsAt: "",
  endsAt: "",
  reason: "",
  applyToAllCourts: false,
};

export const newClosureFormSchema = z
  .object({
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    reason: z.string().min(1, "Reason is required"),
    applyToAllCourts: z.boolean(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  })
  .refine((data) => new Date(data.endsAt) > new Date(), {
    message: "Closure must not be entirely in the past",
    path: ["endsAt"],
  });
