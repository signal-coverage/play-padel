"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  CreateTournamentInput,
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

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? fallbackErrorMessage);
  }
  return res.json();
}

// With a clubId, every request below routes through the admin-only
// /api/admin/clubs/[clubId]/tournaments/** tree (see AdminTournamentsView) —
// same shape as ClubSettingsView/hooks.ts's clubEndpoint/clubQueryKey.
// Without one, this is byte-identical to the original owner-only
// /api/clubs/tournaments/** endpoints/keys.
function tournamentsBasePath(clubId?: string): string {
  return clubId
    ? `/api/admin/clubs/${clubId}/tournaments`
    : "/api/clubs/tournaments";
}

function tournamentPath(
  clubId: string | undefined,
  tournamentId: string,
): string {
  return `${tournamentsBasePath(clubId)}/${tournamentId}`;
}

function categoryPath(
  clubId: string | undefined,
  tournamentId: string,
  categoryId: string,
): string {
  return `${tournamentPath(clubId, tournamentId)}/categories/${categoryId}`;
}

// Only the top-level tournaments list's queryKey needs clubId added — every
// other key below is already scoped by a real, globally-unique resource id
// (tournamentId/categoryId/groupId), so switching the selected club in
// AdminTournamentsView's picker can never show another club's stale data for
// those. The plain list (no id of its own) is the one exception: without
// this, switching clubs would keep showing the previously-selected club's
// tournament list until a hard refetch.
function tournamentsListQueryKey(clubId?: string) {
  return clubId
    ? (["tournaments", "manage", "admin", clubId] as const)
    : (["tournaments", "manage"] as const);
}

export function useManagedTournaments(clubId?: string) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: tournamentsListQueryKey(clubId),
    queryFn: () =>
      fetchJson<{ tournaments: OwnerTournamentSummary[] }>(
        tournamentsBasePath(clubId),
        undefined,
        t("genericError"),
      ).then((data) => data.tournaments),
  });
}

export function useCreateTournament(clubId?: string) {
  const t = useTranslations("TournamentsManagerData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTournamentInput) =>
      fetchJson<{ tournament: OwnerTournamentSummary }>(
        tournamentsBasePath(clubId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tournamentsListQueryKey(clubId),
      });
      toast.success(t("tournamentCreated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function usePublishTournament(clubId?: string) {
  const t = useTranslations("TournamentsManagerData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tournamentId: string) =>
      fetchJson<{ tournament: OwnerTournamentSummary }>(
        `${tournamentPath(clubId, tournamentId)}/publish`,
        { method: "POST" },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tournamentsListQueryKey(clubId),
      });
      toast.success(t("tournamentPublished"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useTournamentDetail(
  tournamentId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "detail", tournamentId, clubId],
    queryFn: () =>
      fetchJson<{ tournament: OwnerTournamentDetail }>(
        tournamentPath(clubId, tournamentId!),
        undefined,
        t("genericError"),
      ).then((data) => data.tournament),
    enabled: Boolean(tournamentId),
  });
}

export function useCategoryTeams(
  tournamentId: string | null,
  categoryId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "teams", categoryId],
    queryFn: () =>
      fetchJson<{ teams: CategoryTeam[] }>(
        `${categoryPath(clubId, tournamentId!, categoryId!)}/teams`,
        undefined,
        t("genericError"),
      ).then((data) => data.teams),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useCategoryGroups(
  tournamentId: string | null,
  categoryId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "groups", categoryId],
    queryFn: () =>
      fetchJson<{ groups: CategoryGroup[] }>(
        `${categoryPath(clubId, tournamentId!, categoryId!)}/groups`,
        undefined,
        t("genericError"),
      ).then((data) => data.groups),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useSetGroups(
  tournamentId: string,
  categoryId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetGroupsInput) =>
      fetchJson<{ ok: true }>(
        `${categoryPath(clubId, tournamentId, categoryId)}/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "groups", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "teams", categoryId],
      });
      toast.success(t("groupsSaved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useLockGroups(
  tournamentId: string,
  categoryId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>(
        `${categoryPath(clubId, tournamentId, categoryId)}/groups/lock`,
        { method: "POST" },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "detail", tournamentId, clubId],
      });
      toast.success(t("groupsLocked"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useGroupMatches(
  tournamentId: string | null,
  categoryId: string | null,
  groupId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "group-matches", groupId],
    queryFn: () =>
      fetchJson<{ matches: GroupMatch[] }>(
        `${categoryPath(clubId, tournamentId!, categoryId!)}/groups/${groupId}/matches`,
        undefined,
        t("genericError"),
      ).then((data) => data.matches),
    enabled: Boolean(tournamentId && categoryId && groupId),
  });
}

export function useGroupStandings(
  tournamentId: string | null,
  categoryId: string | null,
  groupId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "group-standings", groupId],
    queryFn: () =>
      fetchJson<{ standings: StandingRowRecord[] }>(
        `${categoryPath(clubId, tournamentId!, categoryId!)}/groups/${groupId}/standings`,
        undefined,
        t("genericError"),
      ).then((data) => data.standings),
    enabled: Boolean(tournamentId && categoryId && groupId),
  });
}

export function useEnterMatchScore(
  tournamentId: string,
  categoryId: string,
  groupId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
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
        `${categoryPath(clubId, tournamentId, categoryId)}/matches/${matchId}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-matches", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-standings", groupId],
      });
      toast.success(t("scoreEntered"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRecordWalkover(
  tournamentId: string,
  categoryId: string,
  groupId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
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
        `${categoryPath(clubId, tournamentId, categoryId)}/matches/${matchId}/walkover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-matches", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "group-standings", groupId],
      });
      toast.success(t("walkoverRecorded"));
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
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: ["tournaments", "manage", "group-matches", groupId],
      queryFn: () =>
        fetchJson<{ matches: GroupMatch[] }>(
          `${categoryPath(clubId, tournamentId!, categoryId!)}/groups/${groupId}/matches`,
          undefined,
          t("genericError"),
        ).then((data) => data.matches),
      enabled: Boolean(tournamentId && categoryId && groupId),
    })),
  }).flatMap((result) => result.data ?? []);
}

export function useKnockoutMatches(
  tournamentId: string | null,
  categoryId: string | null,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  return useQuery({
    queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
    queryFn: () =>
      fetchJson<{ matches: GroupMatch[] }>(
        `${categoryPath(clubId, tournamentId!, categoryId!)}/knockout`,
        undefined,
        t("genericError"),
      ).then((data) => data.matches),
    enabled: Boolean(tournamentId && categoryId),
  });
}

export function useGenerateKnockoutBracket(
  tournamentId: string,
  categoryId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson<{ ok: true }>(
        `${categoryPath(clubId, tournamentId, categoryId)}/knockout/generate`,
        { method: "POST" },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "detail", tournamentId, clubId],
      });
      toast.success(t("knockoutBracketGenerated"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useEnterKnockoutMatchScore(
  tournamentId: string,
  categoryId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
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
        `${categoryPath(clubId, tournamentId, categoryId)}/matches/${matchId}/score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      toast.success(t("scoreEntered"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRecordKnockoutWalkover(
  tournamentId: string,
  categoryId: string,
  clubId?: string,
) {
  const t = useTranslations("TournamentsManagerData");
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
        `${categoryPath(clubId, tournamentId, categoryId)}/matches/${matchId}/walkover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        t("genericError"),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tournaments", "manage", "knockout-matches", categoryId],
      });
      toast.success(t("walkoverRecorded"));
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
