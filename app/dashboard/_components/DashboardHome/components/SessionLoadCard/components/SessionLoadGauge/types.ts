import type { GaugeTone, GaugeTrend } from "../../types";

export type SessionLoadGaugeProps = {
  percent: number;
  tone: GaugeTone;
  caption: string;
  trend: GaugeTrend | null;
  hasData: boolean;
  emptyMessage: string;
};
