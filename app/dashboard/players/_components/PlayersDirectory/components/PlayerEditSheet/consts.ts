import { z } from "zod";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
} from "@/core/users/consts";

// "Not set yet" mirrors getPreferredSideLabel/getDominantHandLabel's own
// label for a null value (see core/users/consts.ts) — this sentinel is what
// ./utils.ts's formValuesToPatchInput converts back to null on submit.
export const PREFERRED_SIDE_SELECT_OPTIONS = [
  { value: "unset", label: "Not set yet" },
  ...PREFERRED_SIDE_OPTIONS,
];

export const DOMINANT_HAND_SELECT_OPTIONS = [
  { value: "unset", label: "Not set yet" },
  ...DOMINANT_HAND_OPTIONS,
];

// Mirrors PlayerEditFormValues's shape (see ./types.ts) — drives inline
// field validation only. The real PATCH payload conversion (string enums ->
// real typed values) happens in ./utils.ts's formValuesToPatchInput.
export const playerEditFormSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string(),
  padelCategory: z.string(),
  preferredSide: z.string(),
  dominantHand: z.string(),
});
