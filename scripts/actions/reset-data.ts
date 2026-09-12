/**
 * Wipes every row from every table while keeping the current Prisma schema
 * and migration history completely intact.
 *
 * `TRUNCATE ... CASCADE` resolves FK dependencies across every table in one
 * statement (no manual per-table ordering needed), and `RESTART IDENTITY`
 * resets every serial/identity sequence back to 1 — a genuine clean slate,
 * not just empty rows with sequences left wherever they were. The schema
 * itself, migration history, extensions (pgcrypto, etc.), and Postgres
 * roles/permissions are entirely untouched — this is a data wipe, not
 * `prisma migrate reset`.
 *
 * Split into two steps (list, then wipe) so scripts/menu.ts can show the
 * exact table list and get an explicit confirmation between them —
 * DESTRUCTIVE AND IRREVERSIBLE, there is no undo once wipeAllData runs.
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling either of these).
 */
import { log, withSpinner } from "../lib/prompt";

export async function listResettableTables(): Promise<string[]> {
  const { prisma } = await import("../../infrastructure/db/client");
  try {
    // `tablename` is Postgres' native `name` type, not `text` — Prisma's
    // driver adapter can't deserialize a raw `name` column without an
    // explicit cast (throws "Failed to deserialize column of type 'name'"
    // otherwise).
    const tables = await withSpinner(
      "Looking up tables in the public schema…",
      () =>
        prisma.$queryRaw<{ tablename: string }[]>`
          SELECT tablename::text FROM pg_tables
          WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
          ORDER BY tablename
        `,
    );
    return tables.map(({ tablename }) => tablename);
  } finally {
    await prisma.$disconnect();
  }
}

export async function wipeAllData(tables: string[]): Promise<void> {
  if (tables.length === 0) {
    log.warn("No tables found — nothing to reset.");
    return;
  }

  const { prisma } = await import("../../infrastructure/db/client");
  try {
    const tableList = tables.map((name) => `"${name}"`).join(", ");
    await withSpinner("Truncating…", () =>
      prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
      ),
    );
    log.success(
      `Wiped ${tables.length} table(s). Schema and migration history untouched.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
