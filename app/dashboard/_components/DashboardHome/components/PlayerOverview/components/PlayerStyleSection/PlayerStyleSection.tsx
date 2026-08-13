import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import { EditPlayerStyleDialog } from "./components/EditPlayerStyleDialog";
import { getDominantHandLabel } from "@/core/users/consts";
import type { PlayerStyleSectionProps } from "./types";

export function PlayerStyleSection({
  playerStyle,
  partner,
}: PlayerStyleSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PadelSideDiagram side={playerStyle.preferredSide} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Dominant hand</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">
              {getDominantHandLabel(playerStyle.dominantHand)}
            </span>
            <EditPlayerStyleDialog />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="label-mono">Latest partner</p>
        <LatestPartnerCard partner={partner} />
      </div>
    </div>
  );
}
