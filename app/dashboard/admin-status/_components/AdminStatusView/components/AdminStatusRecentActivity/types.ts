import type { SystemJobLogRecord } from "../../types";

export type AdminStatusRecentActivityProps = {
  entries: SystemJobLogRecord[];
  isLoading: boolean;
};
