export { ease } from "@/lib/consts/animation";

// FAQ ids, in the same order as messages/*.json's LandingFaq.items —
// question/answer text lives in the translation messages, matched
// positionally by index.
export const FAQ_IDS = [
  "booking",
  "payments",
  "courts",
  "plans",
  "cancellations",
  "multipleClubs",
] as const;
