"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  EnterMatchScoreInput,
  RecordWalkoverInput,
  SetGroupsInput,
} from "@/core/tournaments/schemas/tournament.schema";
import type {
  CategoryGroup,
  CategoryTeam,
  GroupMatch,
  OwnerTournamentDetail,
  OwnerTournamentSummary,
  StandingRowRecord,
} from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return res.json();
}

function categoryPath(tournamentId: string, categoryId: string): string {
  return `/api/clubs/tournaments/${tournamentId}/categories/${categoryId}`;
}

export function useManagedTournaments() {
  return useQuery({
    queryKey: ["tournaments", "manage"],
    queryFn: () =>
      fetchJson<{ tournaments: OwnerTournamentSummary[] }>(
        "/api/clubs/tournaments",
      ).then((data) => data.tournaments),
  });
}

export function useTournamentDetail(tournamentId: string | null) {
  return useQuery({
    queryKey: ["tournaments", "manage", "detail", tournamentId],
    queryFn: () =>
      fetchJson<{ tournament: OwnerTournamentDetail }>(
        `/api/clubs/tournaments/${tournamentId}`,
      ).then((data) => data.tournament),
    enabled: Boolean(tournamentId),
  });
}

export function useCategoryTeams(
  tournamentId: string | null,
  categoryId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "manage", "teams", categoryId],
    queryFn: () =>
      fetchJson<{ teams: CategoryTeam[] }>(
        `${categoryPath(tournamentId!, categoryId!)}/teams`,
      ).then((data) => data.teams),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useCategoryGroups(
  tournamentId: string | null,
  categoryId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "manage", "groups", categoryId],
    queryFn: () =>
      fetchJson<{ groups: CategoryGroup[] }>(
        `${categoryPath(tournamentId!, categoryId!)}/groups`,
      ).then((data) => data.groups),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useSetGroups(tournamentId: string, categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetGroupsInput) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "groups", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "teams", categoryId],
      });
      toast.success("Groups saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useLockGroups(tournamentId: string, categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/groups/lock`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "detail", tournamentId],
      });
      toast.success("Groups locked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroupMatches(
  tournamentId: string | null,
  categoryId: string | null,
  groupId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "manage", "group-matches", groupId],
    queryFn: () =>
      fetchJson<{ matches: GroupMatch[] }>(
        `${categoryPath(tournamentId!, categoryId!)}/groups/${groupId}/matches`,
      ).then((data) => data.matches),
    enabled: Boolean(tournamentId && categoryId && groupId),
  });
}

export function useGroupStandings(
  tournamentId: string | null,
  categoryId: string | null,
  groupId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "manage", "group-standings", groupId],
    queryFn: () =>
      fetchJson<{ standings: StandingRowRecord[] }>(
        `${categoryPath(tournamentId!, categoryId!)}/groups/${groupId}/standings`,
      ).then((data) => data.standings),
    enabled: Boolean(tournamentId && categoryId && groupId),
  });
}

export function useEnterMatchScore(
  tournamentId: string,
  categoryId: string,
  groupId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      input,
    }: {
      matchId: string;
      input: EnterMatchScoreInput;
    }) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/matches/${matchId}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-matches", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-standings", groupId],
      });
      toast.success("Score entered");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRecordWalkover(
  tournamentId: string,
  categoryId: string,
  groupId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      input,
    }: {
      matchId: string;
      input: RecordWalkoverInput;
    }) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/matches/${matchId}/walkover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-matches", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-standings", groupId],
      });
      toast.success("Walkover recorded");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// --- Slice 3 ("Knockout + standings") additions below ---

/**
 * Every group's matches for a category, fetched in parallel via the
 * existing per-group matches route (useQueries — same pattern as
 * ReservationsView's per-court slot fetches). Powers the "group stage
 * complete" predicate (isGroupStageComplete, applied by the caller) that
 * gates the "Generate Knockout Bracket" button. Shares its queryKey with
 * useGroupMatches so the currently-selected group's data isn't fetched
 * twice.
 */
export function useAllGroupMatches(
  tournamentId: string | null,
  categoryId: string | null,
  groupIds: string[],
) {
  return useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: ["tournaments", "manage", "group-matches", groupId],
      queryFn: () =>
        fetchJson<{ matches: GroupMatch[] }>(
          `${categoryPath(tournamentId!, categoryId!)}/groups/${groupId}/matches`,
        ).then((data) => data.matches),
      enabled: Boolean(tournamentId && categoryId && groupId),
    })),
  }).flatMap((result) => result.data ?? []);
}

export function useKnockoutMatches(
  tournamentId: string | null,
  categoryId: string | null,
) {
  return useQuery({
    queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
    queryFn: () =>
      fetchJson<{ matches: GroupMatch[] }>(
        `${categoryPath(tournamentId!, categoryId!)}/knockout`,
      ).then((data) => data.matches),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useGenerateKnockoutBracket(
  tournamentId: string,
  categoryId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/knockout/generate`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "detail", tournamentId],
      });
      toast.success("Knockout bracket generated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useEnterKnockoutMatchScore(
  tournamentId: string,
  categoryId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      input,
    }: {
      matchId: string;
      input: EnterMatchScoreInput;
    }) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/matches/${matchId}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      toast.success("Score entered");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRecordKnockoutWalkover(
  tournamentId: string,
  categoryId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      input,
    }: {
      matchId: string;
      input: RecordWalkoverInput;
    }) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(tournamentId, categoryId)}/matches/${matchId}/walkover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      toast.success("Walkover recorded");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
