import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_PERFORMANCE_SUMMARY, MOCK_PLAYER_STYLE } from "./consts";
import type { PartnerSummary, PerformanceSummary, PlayerStyle } from "./types";
import type { DominantHand, PreferredSide } from "@/core/users/types";

const latestPartnerQueryKey = ["player", "latest-partner"];
const performanceSummaryQueryKey = ["player", "performance-summary"];

async function fetchLatestPartner(): Promise<PartnerSummary | null> {
  const res = await fetch("/api/player/latest-partner");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Could not load your latest partner.");
  }
  return body.partner;
}

async function fetchPerformanceSummary(): Promise<PerformanceSummary> {
  const res = await fetch("/api/tournaments/performance-summary");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body?.error ?? "Could not load your tournament performance.",
    );
  }
  return body.performance;
}

/** The real "Latest Partner" data (see app/api/player/latest-partner) —
 * fetched independently of the global profile in useAuth, matching how
 * every other dashboard card fetches its own scoped data (e.g.
 * useOwnerReservationSummary) rather than a mock. */
export function useLatestPartner() {
  return useQuery({
    queryKey: latestPartnerQueryKey,
    queryFn: fetchLatestPartner,
  });
}

/** The real "Performance Summary" data (see
 * app/api/tournaments/performance-summary and
 * computePerformanceSummaryForPlayer) — same independent-fetch pattern as
 * useLatestPartner above, replacing what was MOCK_PERFORMANCE. */
export function usePerformanceSummary() {
  return useQuery({
    queryKey: performanceSummaryQueryKey,
    queryFn: fetchPerformanceSummary,
  });
}

export function usePlayerOverviewData() {
  const { user } = useAuth();
  const { data: partner } = useLatestPartner();
  const { data: performance } = usePerformanceSummary();

  const playerStyle: PlayerStyle = {
    preferredSide: user?.preferredSide ?? MOCK_PLAYER_STYLE.preferredSide,
    dominantHand: user?.dominantHand ?? MOCK_PLAYER_STYLE.dominantHand,
  };

  return {
    playerStyle,
    partner: partner ?? null,
    // Falls back to the zero-value shape (never undefined) while the fetch
    // is still in flight -- PerformanceSummarySection renders `performance`
    // unconditionally, with no loading state of its own.
    performance: performance ?? DEFAULT_PERFORMANCE_SUMMARY,
  };
}

export function useUpdatePlayerStyle() {
  const { refetchProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      preferredSide?: PreferredSide;
      dominantHand?: DominantHand;
    }) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not update your profile.");
      }
      return body;
    },
    onSuccess: () => {
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Play style updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
