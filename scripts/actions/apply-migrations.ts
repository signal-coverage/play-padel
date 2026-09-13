/**
 * Applies pending Prisma migrations to a target database — the same
 * `prisma migrate deploy` you'd run by hand, but actually pointed at
 * .env.local / .env.preview / .env.prod instead of always hitting
 * .env.local, which prisma.config.ts hardcodes with `override: true` (a
 * DATABASE_URL set before the CLI starts never survives that). Works around
 * it the exact way this was done by hand the first time this app's
 * migrations were deployed to preview/prod: a throwaway prisma.config.ts
 * that loads the chosen env file instead, passed via `prisma --config`,
 * deleted again immediately after — never left on disk, never committed.
 *
 * Unlike every other action in this menu, this doesn't touch
 * DATABASE_URL in this process at all (no infrastructure/db/client.ts
 * import) — it shells out to the real Prisma CLI as its own subprocess,
 * because `migrate deploy`/`migrate status` are CLI-only operations with no
 * equivalent on the Prisma Client singleton other actions use.
 *
 * Shows `migrate status` first and asks for explicit confirmation — extra
 * blunt wording for .env.prod — before ever running `migrate deploy`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { askConfirm, log, note, withSpinner } from "../lib/prompt";

export type MigrationEnvFile = ".env.local" | ".env.preview" | ".env.prod";

const TMP_CONFIG_PATH = path.resolve(
  process.cwd(),
  ".prisma.config.migrate-tmp.ts",
);

function buildTempConfig(envFile: MigrationEnvFile): string {
  return `import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ${JSON.stringify(envFile)}, override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
`;
}

type CliResult = { code: number; output: string };

function runPrismaCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    // shell: true is required on Windows — spawning the `npx.cmd` shim
    // directly (bypassing the shell) fails with EINVAL, a known Node/
    // Windows limitation with .cmd files, confirmed against this exact
    // setup. Node warns (DEP0190) that args alongside shell:true are
    // concatenated rather than individually escaped — a real risk in
    // general, but every element below is a fixed literal or
    // TMP_CONFIG_PATH (built by this module itself from process.cwd(),
    // never from user input), so there is nothing here for a shell
    // metacharacter to hide in.
    const child = spawn("npx", ["prisma", ...args], {
      cwd: process.cwd(),
      shell: true,
    });
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

function extractPendingList(statusOutput: string): string {
  const afterHeader = statusOutput.split(
    "Following migrations have not yet been applied:",
  )[1];
  const beforeFooter = afterHeader?.split("To apply migrations")[0];
  return beforeFooter?.trim() || "(see full output above)";
}

export async function applyMigrations(
  envFile: MigrationEnvFile,
): Promise<void> {
  await fs.writeFile(TMP_CONFIG_PATH, buildTempConfig(envFile), "utf8");

  try {
    const status = await withSpinner(
      `Checking migration status for ${envFile}…`,
      () => runPrismaCli(["migrate", "status", "--config", TMP_CONFIG_PATH]),
    );

    if (status.output.includes("up to date")) {
      log.success(`${envFile} is already up to date — nothing to apply.`);
      return;
    }

    if (!status.output.includes("have not yet been applied")) {
      log.error(`Could not determine migration status for ${envFile}:`);
      log.message(status.output.trim());
      return;
    }

    note(extractPendingList(status.output), "Pending migrations");

    const confirmed = await askConfirm(
      envFile === ".env.prod"
        ? "Apply these migrations to PRODUCTION? This cannot be undone."
        : `Apply these migrations to ${envFile}?`,
      false,
    );
    if (!confirmed) {
      log.warn("Cancelled — nothing was applied.");
      return;
    }

    const deploy = await withSpinner(`Applying migrations to ${envFile}…`, () =>
      runPrismaCli(["migrate", "deploy", "--config", TMP_CONFIG_PATH]),
    );

    if (deploy.code === 0) {
      log.success(`Migrations applied to ${envFile}.`);
    } else {
      log.error(`Migration failed (exit code ${deploy.code}):`);
      log.message(deploy.output.trim());
    }
  } finally {
    await fs.rm(TMP_CONFIG_PATH, { force: true });
  }
}
