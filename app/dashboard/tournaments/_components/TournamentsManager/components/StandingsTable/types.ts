import type { StandingRowRecord } from "../../types";

export type StandingsTableProps = {
  rows: StandingRowRecord[];
  teamLabels: Record<string, string>;
};
