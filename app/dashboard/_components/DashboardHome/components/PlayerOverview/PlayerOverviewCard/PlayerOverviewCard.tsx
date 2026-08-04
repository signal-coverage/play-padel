import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { PlayerStyleSection } from "../components/PlayerStyleSection";
import { PerformanceSummarySection } from "../components/PerformanceSummarySection";
import { usePlayerOverviewData } from "../hooks";
import { DOMINANT_HAND_LABELS } from "../consts";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  const { playerStyle, partner, performance } = usePlayerOverviewData();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Card size="sm" className="rounded-2xl [--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>Player Overview</CardTitle>
          <CardAction>
            <Badge variant="secondary">
              {DOMINANT_HAND_LABELS[playerStyle.dominantHand]}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <PlayerStyleSection playerStyle={playerStyle} partner={partner} />
        </CardContent>
      </Card>
      <Card
        size="sm"
        className="rounded-2xl [--card-spacing:--spacing(4)] flex-1"
      >
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceSummarySection performance={performance} />
        </CardContent>
      </Card>
    </div>
  );
}
