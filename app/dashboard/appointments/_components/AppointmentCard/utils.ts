export function formatTimeRange(start: Date | string, end: Date | string): string {
  const startStr = new Date(start).toISOString().slice(11, 16);
  const endStr = new Date(end).toISOString().slice(11, 16);
  return `${startStr} – ${endStr}`;
}
