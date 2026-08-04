import { format } from "date-fns";
import { StatValue } from "@/components/StatValue";
import type { ActivityBodyProps } from "./types";

export function ActivityBody({ dots, stats }: ActivityBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {dots.map((dot) => (
          <span
            key={dot.date}
            title={format(new Date(dot.date), "MMM d")}
            className={
              dot.active
                ? "h-2.5 w-2.5 rounded-full bg-chart-1"
                : "h-2.5 w-2.5 rounded-full ring-1 ring-border"
            }
          />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {stats.map((stat) => (
          <StatValue
            key={stat.label}
            variant="stacked"
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </div>
  );
}
