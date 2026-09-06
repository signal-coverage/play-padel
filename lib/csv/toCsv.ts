export type CsvTable = {
  headers: string[];
  rows: (string | number | null)[][];
};

// Pure RFC 4180 serializer: no dependency on any particular Prisma model or
// call site — every /api/admin/export/* route shapes its own headers/rows
// and hands them here. A value is quoted (with internal double quotes
// doubled) only when it actually contains a comma, double quote, or
// newline; everything else is left bare for a smaller, more readable CSV.
export function toCsv(table: CsvTable): string {
  const lines = [table.headers, ...table.rows].map((row) =>
    row.map(escapeCsvValue).join(","),
  );
  return lines.join("\r\n");
}

function escapeCsvValue(value: string | number | null): string {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
