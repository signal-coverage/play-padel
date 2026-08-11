import { BarChart3 } from "lucide-react";
import { Bar, BarChart, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { OVERVIEW_CHART_CONFIG } from "../../consts";
import type { OverviewChartProps } from "./types";

export function OverviewChart({
  chartData,
  hasActivity,
  caption,
  emptyMessage,
}: OverviewChartProps) {
  if (!hasActivity) {
    return (
      <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
        <EmptyMedia variant="icon" className="size-8 rounded-full">
          <BarChart3 className="size-4" />
        </EmptyMedia>
        <EmptyDescription className="text-xs">{emptyMessage}</EmptyDescription>
      </div>
    );
  }

  const peak = Math.max(...chartData.map((day) => day.total));

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer config={OVERVIEW_CHART_CONFIG} className="h-24 w-full">
        <BarChart data={chartData}>
          <Bar dataKey="total" radius={2}>
            {chartData.map((day) => (
              <Cell
                key={day.date}
                fill={
                  peak > 0 && day.total === peak
                    ? "var(--color-total)"
                    : "var(--muted)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
