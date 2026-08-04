import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import type { PlayerStyleSectionProps } from "./types";

export function PlayerStyleSection({
  playerStyle,
  partner,
}: PlayerStyleSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <PadelSideDiagram
          side={playerStyle.preferredSide}
          className="h-28 w-28"
        />
        <div>
          <p className="text-xs text-muted-foreground">Preferred side</p>
          <p className="text-sm font-semibold capitalize">
            {playerStyle.preferredSide}
          </p>
        </div>
      </div>
      <LatestPartnerCard partner={partner} />
    </div>
  );
}
