export type ClosureFanOutOutcome = {
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  allSucceeded: boolean;
  allFailed: boolean;
  toastTone: "success" | "error";
  toastMessage: string;
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
          ? `Closure created for ${totalCount} courts`
          : "Closure created",
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
          : "Failed to create closure",
    };
  }

  return {
    totalCount,
    succeededCount,
    failedCount,
    allSucceeded,
    allFailed,
    toastTone: "error",
    toastMessage: `Created for ${succeededCount} of ${totalCount} courts. ${failedCount} conflicted — check each court's closures.`,
  };
}
