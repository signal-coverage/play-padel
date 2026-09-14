export type GaugeTone = "good" | "watch" | "bad";

export type GaugeTrend = {
  direction: "up" | "down";
  // The rendering component (SessionLoadGauge) formats this into display
  // text via its own "vsPreviousPeriod" translation key — kept numeric here
  // since this type/utils.ts's buildTrend aren't React components and can't
  // call useTranslations themselves.
  delta: number;
};
