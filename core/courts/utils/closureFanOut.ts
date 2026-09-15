export type ClosureFanOutOutcome = {
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  allSucceeded: boolean;
  allFailed: boolean;
  toastTone: "success" | "error";
  toastMessage: string;
};

// Optional, translated message builders — defaults below reproduce the
// original hardcoded English strings verbatim, so any caller that hasn't
// been translated yet (e.g. Club Settings' closure form) keeps working
// unchanged. A translated caller (ClosuresSheet.tsx) passes its own
// useTranslations-backed builders instead, since this plain util can't call
// useTranslations itself.
export type ClosureFanOutMessages = {
  created: string;
  createdForCourts: (totalCount: number) => string;
  failed: string;
  partial: (
    succeededCount: number,
    totalCount: number,
    failedCount: number,
  ) => string;
};

const DEFAULT_MESSAGES: ClosureFanOutMessages = {
  created: "Closure created",
  createdForCourts: (totalCount) => `Closure created for ${totalCount} courts`,
  failed: "Failed to create closure",
  partial: (succeededCount, totalCount, failedCount) =>
    `Created for ${succeededCount} of ${totalCount} courts. ${failedCount} conflicted — check each court's closures.`,
};

/**
 * Reduces the per-court outcomes of fanning a single closure-creation call
 * out over N courts (via `Promise.allSettled`) into one summary suitable for
 * a single aggregate toast. Shared between ClosuresSheet's "apply to all
 * courts" option and the club-wide closure form in Club Settings, so the
 * all-succeeded / all-failed / partial-failure wording stays identical
 * wherever a closure gets fanned out to multiple courts at once.
 */
export function summarizeClosureFanOut(
  results: PromiseSettledResult<unknown>[],
  messages: ClosureFanOutMessages = DEFAULT_MESSAGES,
): ClosureFanOutOutcome {
  const totalCount = results.length;
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  const failedCount = failures.length;
  const succeededCount = totalCount - failedCount;
  const allSucceeded = failedCount === 0;
  const allFailed = totalCount > 0 && failedCount === totalCount;

  if (allSucceeded) {
    return {
      totalCount,
      succeededCount,
      failedCount,
      allSucceeded,
      allFailed,
      toastTone: "success",
      toastMessage:
        totalCount > 1
          ? messages.createdForCourts(totalCount)
          : messages.created,
    };
  }

  if (allFailed) {
    const [firstFailure] = failures;
    return {
      totalCount,
      succeededCount,
      failedCount,
      allSucceeded,
      allFailed,
      toastTone: "error",
      toastMessage:
        firstFailure.reason instanceof Error
          ? firstFailure.reason.message
          : messages.failed,
    };
  }

  return {
    totalCount,
    succeededCount,
    failedCount,
    allSucceeded,
    allFailed,
    toastTone: "error",
    toastMessage: messages.partial(succeededCount, totalCount, failedCount),
  };
}
