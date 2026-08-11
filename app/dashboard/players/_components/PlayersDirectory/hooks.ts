"use client";

import { useQuery } from "@tanstack/react-query";
import { playersQueryKey } from "./consts";
import type { PlayerProfileData } from "@/components/PlayerProfileCard";

type PlayerListItem = PlayerProfileData & { id: string };

async function fetchPlayers(): Promise<PlayerListItem[]> {
  const res = await fetch("/api/players");
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Could not load players.");
  }
  return body.players;
}

export function usePlayers() {
  return useQuery({
    queryKey: playersQueryKey,
    queryFn: fetchPlayers,
  });
}
