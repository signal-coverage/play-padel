export type SystemJobKind = "CRON" | "WEBHOOK";
export type SystemJobStatus = "SUCCESS" | "FAILURE";

export interface SystemJobLogRecord {
  id: string;
  kind: SystemJobKind;
  name: string;
  status: SystemJobStatus;
  startedAt: Date;
  finishedAt: Date;
  errorMessage: string | null;
  createdAt: Date;
}

export interface LogSystemJobParams {
  kind: SystemJobKind;
  name: string;
  status: SystemJobStatus;
  startedAt: Date;
  finishedAt: Date;
  errorMessage?: string;
}
