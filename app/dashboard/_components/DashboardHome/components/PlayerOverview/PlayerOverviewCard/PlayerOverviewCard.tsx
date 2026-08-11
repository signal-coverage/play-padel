import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up flex h-full flex-col overflow-hidden rounded-2xl [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "180ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Player Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <PlayerOverviewContent />
      </CardContent>
    </Card>
  );
}
