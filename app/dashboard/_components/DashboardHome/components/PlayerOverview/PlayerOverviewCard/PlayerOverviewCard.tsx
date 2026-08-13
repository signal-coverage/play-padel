import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up flex h-full w-70 shrink-0 flex-col gap-4 overflow-hidden rounded-sm py-5 px-2 border-primary [--card-spacing:--spacing(4)]",
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
