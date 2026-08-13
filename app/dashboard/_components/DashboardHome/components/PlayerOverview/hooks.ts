import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_LATEST_PARTNER, MOCK_PERFORMANCE } from "./consts";
import type { PlayerStyle } from "./types";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export function usePlayerOverviewData() {
  const { user } = useAuth();

  const playerStyle: PlayerStyle = {
    preferredSide: user?.preferredSide ?? null,
    dominantHand: user?.dominantHand ?? null,
  };

  return {
    playerStyle,
    partner: MOCK_LATEST_PARTNER,
    performance: MOCK_PERFORMANCE,
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
