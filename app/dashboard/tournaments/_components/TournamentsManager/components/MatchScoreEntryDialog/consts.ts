import { z } from "zod";

function isFilled(value: string | undefined): boolean {
  return (value ?? "").trim() !== "";
}

// Every user-facing validation message lives in the messages/*.json
// "MatchScoreEntryValidation" namespace, not as a literal here — this schema
// is built fresh on every render by the component (see MatchScoreEntryDialog),
// so it can't call useTranslations() itself. Same buildXSchema(t) factory
// pattern as app/onboarding/types.ts's buildOnboardingFormSchema.
export type MatchScoreValidationT = (key: string) => string;

// Mirrors deriveMatchResult's own best-of-3 logic client-side: once sets 1
// and 2 already decide the match (same side won both), set 3 must stay
// empty; otherwise (a 1-1 split) set 3 is required to produce a winner.
export function buildMatchScoreFormSchema(t: MatchScoreValidationT) {
  const gamesFieldSchema = z.coerce.number().int().min(0, t("minZero"));

  return z
    .object({
      set1TeamAGames: gamesFieldSchema,
      set1TeamBGames: gamesFieldSchema,
      set2TeamAGames: gamesFieldSchema,
      set2TeamBGames: gamesFieldSchema,
      set3TeamAGames: z.string().optional(),
      set3TeamBGames: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const set1Winner =
        data.set1TeamAGames > data.set1TeamBGames
          ? "A"
          : data.set1TeamBGames > data.set1TeamAGames
            ? "B"
            : null;
      const set2Winner =
        data.set2TeamAGames > data.set2TeamBGames
          ? "A"
          : data.set2TeamBGames > data.set2TeamAGames
            ? "B"
            : null;
      const decidedAfterTwoSets =
        set1Winner !== null && set1Winner === set2Winner;

      const set3AFilled = isFilled(data.set3TeamAGames);
      const set3BFilled = isFilled(data.set3TeamBGames);

      if (decidedAfterTwoSets) {
        if (set3AFilled || set3BFilled) {
          ctx.addIssue({
            code: "custom",
            path: ["set3TeamAGames"],
            message: t("decidedLeaveEmpty"),
          });
        }
        return;
      }

      if (!set3AFilled || !set3BFilled) {
        ctx.addIssue({
          code: "custom",
          path: ["set3TeamAGames"],
          message: t("set3Required"),
        });
        return;
      }

      const setThreeA = Number(data.set3TeamAGames);
      const setThreeB = Number(data.set3TeamBGames);
      if (
        !Number.isInteger(setThreeA) ||
        setThreeA < 0 ||
        !Number.isInteger(setThreeB) ||
        setThreeB < 0
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["set3TeamAGames"],
          message: t("invalidSet3"),
        });
      }
    });
}

// z.coerce.number() makes the schema's input type diverge from its output
// type (unknown vs number) — RHF's useForm needs both, via its 3-generic
// form, or zodResolver's type doesn't line up with register()/handleSubmit().
export type MatchScoreFormInput = z.input<
  ReturnType<typeof buildMatchScoreFormSchema>
>;
export type MatchScoreFormValues = z.output<
  ReturnType<typeof buildMatchScoreFormSchema>
>;

export const DEFAULT_VALUES: MatchScoreFormInput = {
  set1TeamAGames: 0,
  set1TeamBGames: 0,
  set2TeamAGames: 0,
  set2TeamBGames: 0,
  set3TeamAGames: "",
  set3TeamBGames: "",
};

export interface MatchScoreSetInput {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
}

export function toMatchScoreSets(
  values: MatchScoreFormValues,
): MatchScoreSetInput[] {
  const sets: MatchScoreSetInput[] = [
    {
      setNumber: 1,
      teamAGames: values.set1TeamAGames,
      teamBGames: values.set1TeamBGames,
    },
    {
      setNumber: 2,
      teamAGames: values.set2TeamAGames,
      teamBGames: values.set2TeamBGames,
    },
  ];

  if (isFilled(values.set3TeamAGames) && isFilled(values.set3TeamBGames)) {
    sets.push({
      setNumber: 3,
      teamAGames: Number(values.set3TeamAGames),
      teamBGames: Number(values.set3TeamBGames),
    });
  }

  return sets;
}
