import { useTranslations } from "next-intl";
import { PadelSideDiagram } from "./components/PadelSideDiagram";
import { LatestPartnerCard } from "./components/LatestPartnerCard";
import { EditPlayerStyleDialog } from "./components/EditPlayerStyleDialog";
import { getDominantHandLabel } from "@/core/users/consts";
import type { PlayerStyleSectionProps } from "./types";

export function PlayerStyleSection({
  playerStyle,
  partner,
}: PlayerStyleSectionProps) {
  const t = useTranslations("PlayerStyleSection");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <PadelSideDiagram side={playerStyle.preferredSide} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("dominantHand")}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">
              {getDominantHandLabel(playerStyle.dominantHand)}
            </span>
            <EditPlayerStyleDialog />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="label-mono">{t("latestPartner")}</p>
        <LatestPartnerCard partner={partner} />
      </div>
    </div>
  );
}
