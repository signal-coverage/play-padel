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
 * listResettableTables/wipeAllData are the low-level, single-connection
 * primitives — used directly by reset-data-worker.ts (a fresh child
 * process, see its own header comment for why), and kept exported here
 * too since they're the one place the actual SQL lives.
 *
 * resetAllData is what scripts/menu.ts actually calls: it drives the
 * whole "which database → show tables → confirm → wipe" flow through TWO
 * separate reset-data-worker.ts invocations (list, then wipe), the same
 * shape as apply-migrations.ts's status-then-deploy — and for the same
 * reason: this process's own Prisma client (infrastructure/db/client.ts)
 * is a singleton pinned to whichever database menu.ts's loadEnv() first
 * loaded this run, so acting in-process here would silently target
 * whatever database an earlier, unrelated action happened to load rather
 * than the one just chosen for this destructive action. Spawning a fresh
 * process per call is what makes a different answer each time actually
 * take effect.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import { askConfirm, log, note, withSpinner } from "../lib/prompt";

export type ResetEnvFile = ".env.local" | ".env.preview" | ".env.prod";

const WORKER_PATH = path.resolve(
  process.cwd(),
  "scripts/actions/reset-data-worker.ts",
);

type WorkerResult = { code: number; output: string };

function runWorker(
  envFile: ResetEnvFile,
  mode?: "--wipe",
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    // shell: true is required on Windows — spawning the `npx.cmd` shim
    // directly (bypassing the shell) fails with EINVAL, the same known
    // Node/Windows limitation documented in apply-migrations.ts. Every
    // element below is a fixed literal, WORKER_PATH (built from
    // process.cwd()), or one of the three literal ENV_FILES values — never
    // user input — so there's nothing here for a shell metacharacter to
    // hide in.
    const args = ["tsx", WORKER_PATH, envFile, ...(mode ? [mode] : [])];
    const child = spawn("npx", args, { cwd: process.cwd(), shell: true });
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

export async function resetAllData(envFile: ResetEnvFile): Promise<void> {
  const listing = await withSpinner(`Looking up tables on ${envFile}…`, () =>
    runWorker(envFile),
  );

  if (listing.code !== 0) {
    log.error(`Could not list tables on ${envFile}:`);
    log.message(listing.output.trim());
    return;
  }

  const match = /TABLES:(.*)/.exec(listing.output);
  const tables = match?.[1] ? match[1].split(",").filter(Boolean) : [];
  if (tables.length === 0) {
    log.warn("No tables found — nothing to reset.");
    return;
  }

  note(
    tables.map((name) => `- ${name}`).join("\n"),
    `${tables.length} table(s) would be wiped on ${envFile} (all rows, sequences reset to 1)`,
  );

  const confirmed = await askConfirm(
    envFile === ".env.prod"
      ? "This permanently deletes ALL rows in ALL tables above on PRODUCTION — cannot be undone. Continue?"
      : `This permanently deletes ALL rows in ALL tables above on ${envFile} — cannot be undone. Continue?`,
    false,
  );
  if (!confirmed) {
    log.warn("Cancelled — nothing was touched.");
    return;
  }

  const wipe = await withSpinner(`Wiping ${envFile}…`, () =>
    runWorker(envFile, "--wipe"),
  );

  if (wipe.code === 0) {
    log.success(
      `Wiped ${tables.length} table(s) on ${envFile}. Schema and migration history untouched.`,
    );
  } else {
    log.error(`Reset failed on ${envFile} (exit code ${wipe.code}):`);
    log.message(wipe.output.trim());
  }
}

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
