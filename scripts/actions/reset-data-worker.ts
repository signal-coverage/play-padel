/**
 * Standalone entrypoint, spawned as a FRESH child process by resetAllData()
 * (./reset-data.ts) — never imported directly, never run by hand.
 *
 * Exists purely to get a genuinely new infrastructure/db/client.ts Prisma
 * singleton bound to whichever env file is passed as argv[2]. The parent
 * process (scripts/menu.ts) keeps its own Prisma client pinned to
 * whichever database loadEnv() first loaded this run — see that file's
 * header comment — so reusing the parent's in-process client here would
 * silently wipe whatever database an earlier, unrelated action happened to
 * load, not necessarily the one just chosen for THIS destructive action.
 * That mismatch was a real bug: "Reset all data" looked like it re-asked
 * which database, but the answer was never actually applied. Running this
 * file as its own process, with the target env file loaded into ITS OWN
 * process.env before anything imports the Prisma client, is what makes a
 * different answer each time actually take effect.
 *
 * Modes (argv[3]):
 *   (none)   — lists resettable tables, prints one line
 *              "TABLES:<comma-separated-names>" to stdout, then exits.
 *   --wipe   — re-lists the tables (a fresh connection has no other source
 *              of truth for what's still there) and truncates them.
 */
import path from "node:path";
import { config } from "dotenv";

const envFile = process.argv[2];
const mode = process.argv[3];

if (!envFile) {
  console.error("Missing env file argument.");
  process.exit(1);
}

// Must happen before the dynamic import below — infrastructure/db/client.ts
// reads process.env.DATABASE_URL at module-load time.
config({ path: path.resolve(process.cwd(), envFile), override: true });

async function main() {
  const { listResettableTables, wipeAllData } = await import("./reset-data");
  const tables = await listResettableTables();

  if (mode === "--wipe") {
    await wipeAllData(tables);
  } else {
    console.log(`TABLES:${tables.join(",")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
