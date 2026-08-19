import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { DashboardBentoCardProps } from "./types";

export function DashboardBentoCard({
  title,
  animationDelay,
  className,
  contentClassName,
  children,
}: DashboardBentoCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up rounded-sm border-primary px-2 py-5 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
