import { Check } from "lucide-react";
import { STEP_META } from "../../consts";
import type { StepIndicatorProps } from "./types";

export function StepIndicator({ flow, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full mb-8">
      {flow.map((key, i) => {
        const meta = STEP_META[key];
        const done = current > i;
        const active = current === i;
        return (
          <div
            key={key}
            className="flex items-center flex-1 last:flex-none"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ease-out",
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                      ? "bg-card border-primary text-primary scale-105"
                      : "bg-muted border-muted-foreground/20 text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={[
                  "text-xs font-medium transition-colors duration-300 ease-out",
                  active
                    ? "text-primary"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {meta.label}
              </span>
            </div>
            {i < flow.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 mb-4 rounded transition-colors duration-500 ease-out",
                  current > i ? "bg-primary" : "bg-muted-foreground/20",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
