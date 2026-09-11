"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerPicker } from "@/components/PlayerPicker";
import { RegisteredTeamsList } from "./components/RegisteredTeamsList";
import { useCategoryTeams, useRegisterTeam, useWithdrawTeam } from "./hooks";
import type { RegistrationPanelProps } from "./types";

/**
 * Registration panel shown while a category is still REGISTRATION_OPEN
 * (see TournamentModal, which swaps this out for the read-only
 * GroupsStandingsView once a category moves past that status). Shows the
 * viewer's own registration status first — either a single-select
 * PlayerPicker + Register button, or their current partner + a Withdraw
 * button — then every other active team already signed up.
 */
export function RegistrationPanel({
  tournamentId,
  categoryId,
  viewerId,
}: RegistrationPanelProps) {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const { data: teams, isLoading } = useCategoryTeams(tournamentId, categoryId);
  const registerTeam = useRegisterTeam(tournamentId, categoryId);
  const withdrawTeam = useWithdrawTeam(tournamentId, categoryId);

  const activeTeams = (teams ?? []).filter(
    (team) => team.status !== "WITHDRAWN",
  );
  const myTeam = activeTeams.find(
    (team) => team.player1Id === viewerId || team.player2Id === viewerId,
  );

  function handleRegister() {
    if (!partnerId) return;
    registerTeam.mutate(partnerId, {
      onSuccess: () => setPartnerId(null),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {myTeam ? (
        <div className="flex items-center justify-between gap-2 rounded-sm border p-3">
          <p className="text-sm">
            You&apos;re registered with{" "}
            <span className="font-medium">
              {myTeam.player1Id === viewerId
                ? myTeam.player2DisplayName
                : myTeam.player1DisplayName}
            </span>
            .
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={withdrawTeam.isPending}
            onClick={() => withdrawTeam.mutate(myTeam.id)}
          >
            {withdrawTeam.isPending ? "Withdrawing…" : "Withdraw"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Register with a partner</p>
          <PlayerPicker
            selectedIds={partnerId ? [partnerId] : []}
            onChange={(ids) => setPartnerId(ids[0] ?? null)}
            excludeUserId={viewerId}
            max={1}
          />
          <Button
            type="button"
            disabled={!partnerId || registerTeam.isPending}
            onClick={handleRegister}
          >
            {registerTeam.isPending ? "Registering…" : "Register"}
          </Button>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Registered teams</p>
        <RegisteredTeamsList teams={activeTeams} isLoading={isLoading} />
      </div>
    </div>
  );
}
