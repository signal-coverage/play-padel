import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { UTILIZATION_CHART_CONFIG } from "../../consts";
import type { GaugeProps } from "./types";

export function Gauge({ percentage, display, band }: GaugeProps) {
  return (
    <>
      <div className="relative flex h-20 w-20 items-center justify-center">
        <ChartContainer
          config={UTILIZATION_CHART_CONFIG}
          className="h-full w-full"
        >
          <RadialBarChart
            data={[{ value: percentage }]}
            startAngle={90}
            endAngle={-270}
            innerRadius={28}
            outerRadius={40}
            barSize={8}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={4}
              className={band.fillClassName}
              background={{ fill: "var(--muted)" }}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{display}</span>
        </div>
      </div>
      <Badge variant="outline" className={band.textClassName}>
        {band.label}
      </Badge>
    </>
  );
}
