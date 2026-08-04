export type ActivityDot = {
  date: string;
  active: boolean;
};

export type ActivityStat = {
  label: string;
  value: string;
};

export type ActivityBodyProps = {
  dots: ActivityDot[];
  stats: ActivityStat[];
};
