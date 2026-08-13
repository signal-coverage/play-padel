export type OverviewChartDatum = {
  date: string;
  total: number;
};

export type OverviewChartProps = {
  chartData: OverviewChartDatum[];
  hasActivity: boolean;
  caption: string | null;
  emptyMessage: string;
};
