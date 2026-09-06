import type {
  RawSystemJobLogRecord,
  RawSystemStatusResponse,
  SystemJobLogRecord,
  SystemStatusData,
} from "./types";

export function toSystemJobLogRecord(
  raw: RawSystemJobLogRecord,
): SystemJobLogRecord {
  return {
    ...raw,
    startedAt: new Date(raw.startedAt),
    finishedAt: new Date(raw.finishedAt),
    createdAt: new Date(raw.createdAt),
  };
}

export function toSystemStatusData(
  raw: RawSystemStatusResponse,
): SystemStatusData {
  return {
    summary: Object.fromEntries(
      Object.entries(raw.summary).map(([name, record]) => [
        name,
        record ? toSystemJobLogRecord(record) : null,
      ]),
    ),
    recent: raw.recent.map(toSystemJobLogRecord),
  };
}
