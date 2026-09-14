/**
 * menu — the one entry point for every maintenance script in this repo.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  USAGE                                                                 │
 * │                                                                       │
 * │    npm run manage                                                     │
 * │                                                                       │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Everything is picked from an arrow-key menu (@clack/prompts, the same
 * library behind most "npm create ..." installers) — no command, flag, or
 * environment file to type by hand. Each action's own dangerous options
 * (e.g. activate-free-plan's --force) are shown as a plain yes/no question
 * with a description of what it actually does, asked right before running.
 *
 * Runs actions in a loop — after one finishes, you're back at the top-level
 * menu to run another, until you pick Exit (or Esc/Ctrl+C, which works the
 * same way at that top-level question). One database per PROCESS, though:
 * the Prisma client (infrastructure/db/client.ts) is a module-level
 * singleton created from whichever DATABASE_URL was active the first time
 * it's imported, so switching DATABASE_URL for a second action would
 * silently keep querying the FIRST database instead. loadEnv() below asks
 * "which database" only once per run and then reuses that same choice for
 * every later Prisma-backed action automatically — apply-migrations is the
 * one exception, since it shells out to a fresh `prisma` subprocess per
 * call instead of using this singleton, so it's free to target a different
 * database on every invocation, in the same run, safely.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  askChoice,
  askChoiceOrBack,
  askConfirm,
  askText,
  BACK,
  cancelAndExit,
  intro,
  log,
  outro,
} from "./lib/prompt";
import { describeTarget } from "./lib/style";

type EnvFile = ".env.local" | ".env.preview" | ".env.prod";

const ENV_FILES: { value: EnvFile; label: string; description: string }[] = [
  {
    value: ".env.local",
    label: ".env.local",
    description: "Local / development database",
  },
  {
    value: ".env.preview",
    label: ".env.preview",
    description: "Preview deployment database",
  },
  {
    value: ".env.prod",
    label: ".env.prod",
    description: "Production database — be VERY careful",
  },
];

// Set the first time loadEnv() actually loads a database in this process,
// and reused by every subsequent call — see this file's header comment for
// why a second, different DATABASE_URL can't safely take effect once the
// Prisma client singleton has already been created from the first one.
let activeEnvFile: EnvFile | null = null;

// Returns false (never touches DATABASE_URL/dotenv) when the user backs out
// of the "which database" choice on its first call instead of picking one —
// callers propagate that straight back to main()'s loop so it can re-ask
// the top-level action question, rather than proceeding into an action with
// no database actually loaded. Every call after the first silently reuses
// whichever database got picked then, without asking again.
async function loadEnv(): Promise<boolean> {
  if (activeEnvFile) {
    log.info(
      `database  ${describeTarget(process.env.DATABASE_URL)} (reusing this run's database — restart to target a different one)`,
    );
    return true;
  }

  const envFile = await askChoiceOrBack(
    "Which database do you want to target?",
    ENV_FILES,
  );
  if (envFile === BACK) return false;

  const dotenv = await import("dotenv");
  const result = dotenv.config({
    path: path.resolve(process.cwd(), envFile),
    override: true,
  });
  if (result.error) {
    cancelAndExit(`Could not load ${envFile}: ${result.error.message}`);
  }

  activeEnvFile = envFile;
  log.info(`database  ${describeTarget(process.env.DATABASE_URL)}`);
  return true;
}

async function runGrantAdmin(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const email = await askText("User email to grant admin access to:", {
    placeholder: "owner@club.com",
  });
  const { grantAdmin } = await import("./actions/grant-admin");
  await grantAdmin(email);
  return true;
}

async function runRevokeAdmin(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const email = await askText("User email to revoke admin access from:", {
    placeholder: "owner@club.com",
  });
  const { revokeAdmin } = await import("./actions/revoke-admin");
  await revokeAdmin(email);
  return true;
}

// Shared by both membership actions below — resolves a clubId by looking up
// the club's OWNER by email (never a raw clubId typed by hand: the database
// never actually deletes a Club row when its owner deletes their account —
// see resolve-club.ts's own comment — so this only ever matches a currently
// ACTIVE club, never a defunct one still sitting in the table). Exits the
// whole process on a lookup miss rather than returning something callers
// would have to re-check — there is nothing useful left to do once the
// target club can't be identified.
async function resolveClubId(): Promise<string> {
  const email = await askText("Owner's email:", {
    placeholder: "owner@club.com",
  });
  const { resolveClubIdByEmail } = await import("./actions/resolve-club");
  const result = await resolveClubIdByEmail(email);
  if (!result) {
    cancelAndExit(`No active club found for owner ${email}.`);
  }
  log.info(`Found club: ${result.clubName}`);
  return result.clubId;
}

async function runActivateFreePlan(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const clubId = await resolveClubId();

  // The FREE plan is exclusively a testing tool (see this menu entry's own
  // description below) — the overwhelming majority of clubs it's run
  // against have no real Mercado Pago subscription attached at all, so this
  // checks first and only asks to override when there's an actual conflict
  // to decide about, instead of asking every single time regardless.
  const { clubHasRealMercadoPagoSubscription } =
    await import("../core/billing/services/membership.service");
  const hasRealSubscription = await clubHasRealMercadoPagoSubscription(clubId);
  const force = hasRealSubscription
    ? await askConfirm(
        "This club already has a real Mercado Pago subscription attached. Override it anyway? (refused by default — a net against a mistyped clubId)",
        false,
      )
    : false;

  const { activateFreePlanForClub } =
    await import("./actions/activate-free-plan");
  await activateFreePlanForClub(clubId, force);
  return true;
}

const WELCOME_MONTH_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const months = i + 1;
  return {
    value: String(months),
    label: `${months} month${months > 1 ? "s" : ""}`,
  };
});

async function runGrantWelcomePeriod(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const clubId = await resolveClubId();
  const months = Number(
    await askChoice("How many months of free welcome time?", [
      ...WELCOME_MONTH_OPTIONS,
    ] as const),
  );
  const force = await askConfirm(
    "Override a club that already has a real Mercado Pago subscription attached? (refused by default — a net against a mistyped clubId)",
    false,
  );
  const { grantWelcomePeriodForClub } =
    await import("./actions/grant-welcome-period");
  await grantWelcomePeriodForClub(clubId, months, force);
  return true;
}

async function runReconcileAdminFlags(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const { reconcileAdminFlags } =
    await import("./actions/reconcile-admin-flags");
  await reconcileAdminFlags();
  return true;
}

async function runDescribeClub(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const clubId = await resolveClubId();
  const { describeClub } = await import("./actions/describe-club");
  await describeClub(clubId);
  return true;
}

async function runForceMercadoPagoHoldSweep(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const { forceMercadoPagoHoldSweep } =
    await import("./actions/force-mp-hold-sweep");
  await forceMercadoPagoHoldSweep();
  return true;
}

async function runSetClubStatus(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const email = await askText("Owner's email:", {
    placeholder: "owner@club.com",
  });
  const { resolveClubIdByEmail } = await import("./actions/resolve-club");
  const result = await resolveClubIdByEmail(email);
  if (!result) {
    cancelAndExit(`No active club found for owner ${email}.`);
  }
  log.info(`Found club: ${result.clubName}`);

  const status = await askChoice("What should its status become?", [
    {
      value: "SUSPENDED",
      label: "Suspend",
      description: "Locks the owner's dashboard until reactivated",
    },
    {
      value: "ACTIVE",
      label: "Reactivate",
      description: "Restores normal access (sets status back to ACTIVE)",
    },
  ] as const);

  const { setClubStatusForClub } = await import("./actions/set-club-status");
  await setClubStatusForClub(result.clubId, result.clubName, status);
  return true;
}

async function runApplyMigrations(): Promise<boolean> {
  // Deliberately NOT loadEnv() — this action never touches this process's
  // own DATABASE_URL (no infrastructure/db/client.ts import happens here at
  // all); it shells out to the Prisma CLI as its own subprocess, pointed at
  // the chosen env file via a throwaway prisma.config.ts (see
  // scripts/actions/apply-migrations.ts for why). Loops back to re-ask
  // which database on Esc/Ctrl+C, same as every other env-file picker here.
  const envFile = await askChoiceOrBack(
    "Apply pending migrations to which database?",
    ENV_FILES,
  );
  if (envFile === BACK) return false;

  const { applyMigrations } = await import("./actions/apply-migrations");
  await applyMigrations(envFile);
  return true;
}

async function runResetData(): Promise<boolean> {
  // Deliberately NOT loadEnv() — same reasoning as apply-migrations just
  // above: this is the one other action that must NEVER silently reuse
  // whichever database an earlier, unrelated action in this run happened
  // to load. That was a real bug — this used to call loadEnv() like every
  // read/write action, so once a database had been picked once this run,
  // every later "Reset all data" ran against it directly with no new
  // question and no visible warning. Always asking fresh here, and letting
  // resetAllData() (scripts/actions/reset-data.ts) run the actual wipe in
  // its own subprocess per call, is what makes a different answer each
  // time actually take effect (loadEnv()'s cached Prisma client couldn't
  // do that even if this DID re-ask).
  const envFile = await askChoiceOrBack(
    "Reset ALL data on which database?",
    ENV_FILES,
  );
  if (envFile === BACK) return false;

  const { resetAllData } = await import("./actions/reset-data");
  await resetAllData(envFile);
  return true;
}

export async function main() {
  intro("Play Padel · maintenance scripts");

  // Always loops back here after an action finishes — whether it actually
  // ran or the user backed out of it first (e.g. out of loadEnv()'s "which
  // database" choice) — so you can run another action without re-running
  // `npm run manage`. The only ways out are picking "Exit" below, or
  // Esc/Ctrl+C on this same top-level question (askChoiceOrBack's BACK
  // case, handled as a cancel here since there's nowhere further back to
  // go). See this file's header comment for why every Prisma-backed action
  // still targets the SAME database for the rest of this run once one has
  // been picked.
  while (true) {
    const action = await askChoiceOrBack("What do you want to do?", [
      {
        value: "grant-admin",
        label: "Grant admin access",
        description: "Sets UserProfile.isAdmin = true for one user, by email",
      },
      {
        value: "revoke-admin",
        label: "Revoke admin access",
        description: "Sets UserProfile.isAdmin = false for one user, by email",
      },
      {
        value: "free-plan",
        label: "Activate FREE membership plan",
        description:
          "Unlocks a club's dashboard for testing, without a real Mercado Pago subscription",
      },
      {
        value: "welcome-period",
        label: "Grant welcome free months",
        description:
          "Gives any club 1-7 free months — for an eventuality, a grace extension, or marketing",
      },
      {
        value: "reconcile-admin",
        label: "Reconcile admin flags",
        description:
          "Read-only audit — reports any drift between UserProfile.isAdmin and Clerk publicMetadata.isAdmin",
      },
      {
        value: "describe-club",
        label: "Describe / diagnose a club",
        description:
          "Prints a quick health check: status, plan, Mercado Pago connection, membership, operating hours, court count",
      },
      {
        value: "force-mp-sweep",
        label: "Force Mercado Pago hold sweep",
        description:
          "Runs the daily expired-hold sweep now, instead of waiting for the cron",
      },
      {
        value: "set-club-status",
        label: "Suspend / reactivate a club",
        description:
          "Same action as the in-app admin panel — notifies the owner either way",
      },
      {
        value: "apply-migrations",
        label: "Apply pending migrations",
        description:
          "Runs prisma migrate deploy against local/preview/prod — shows what's pending and asks first",
      },
      {
        value: "reset-data",
        label: "Reset all data",
        description:
          "DESTRUCTIVE — wipes every row from every table, keeps the schema and migrations",
      },
      { value: "exit", label: "Exit", description: "Do nothing" },
    ] as const);

    if (action === BACK) {
      // Nowhere left to go back to from the very first question.
      cancelAndExit("Cancelled — nothing was touched.");
    }
    if (action === "exit") break;

    // Each run*() still resolves to a boolean (true = actually ran, false =
    // backed out of its own db-picker first) — kept on every action's own
    // signature since it's a meaningful outcome, just no longer read here:
    // either way, loop back to the top-level menu now instead of ending the
    // process (see this function's own header comment).
    switch (action) {
      case "grant-admin":
        await runGrantAdmin();
        break;
      case "revoke-admin":
        await runRevokeAdmin();
        break;
      case "free-plan":
        await runActivateFreePlan();
        break;
      case "welcome-period":
        await runGrantWelcomePeriod();
        break;
      case "reconcile-admin":
        await runReconcileAdminFlags();
        break;
      case "describe-club":
        await runDescribeClub();
        break;
      case "force-mp-sweep":
        await runForceMercadoPagoHoldSweep();
        break;
      case "set-club-status":
        await runSetClubStatus();
        break;
      case "apply-migrations":
        await runApplyMigrations();
        break;
      case "reset-data":
        await runResetData();
        break;
    }
  }

  outro("Done.");
}

// Only auto-runs when this file is the direct entrypoint (`tsx
// scripts/menu.ts` / `npm run manage`), never when imported — menu.test.ts
// imports `main` to drive it under mocks, and an unguarded call here would
// fire the real interactive CLI the instant that import happens.
// pathToFileURL (not manual string-building) so drive-letter casing and
// slash direction on Windows compare correctly against import.meta.url.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    log.error("Unexpected error:");
    console.error(err);
    process.exitCode = 1;
  });
}
