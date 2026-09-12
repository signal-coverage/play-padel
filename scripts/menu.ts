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
 * One action per run — the Prisma client (infrastructure/db/client.ts) is
 * a module-level singleton created from whichever DATABASE_URL was active
 * the first time it's imported, so looping back and picking a DIFFERENT
 * database for a second action in the same process would silently keep
 * using the FIRST one. That first import only ever happens inside an
 * action's own file (grant-admin.ts, resolve-club.ts, etc.), never before —
 * so the top-level action choice and the "which .env file" choice below
 * can safely loop back to themselves (Esc/Ctrl+C -> re-ask, via
 * askChoiceOrBack) if the wrong one was picked. Once an action actually
 * starts running past that point, cancelling exits the whole process
 * instead (askText/askChoice/askConfirm's normal behavior) — re-run
 * `npm run manage` for a second action, same as before.
 */
import path from "node:path";
import {
  askChoice,
  askChoiceOrBack,
  askConfirm,
  askText,
  BACK,
  cancelAndExit,
  intro,
  log,
  note,
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

// Returns false (never touches DATABASE_URL/dotenv) when the user backs out
// of this choice instead of picking one — callers propagate that straight
// back to main()'s loop so it can re-ask the top-level action question,
// rather than proceeding into an action with no database actually loaded.
async function loadEnv(): Promise<boolean> {
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

async function runResetData(): Promise<boolean> {
  if (!(await loadEnv())) return false;
  const { listResettableTables, wipeAllData } =
    await import("./actions/reset-data");

  const tables = await listResettableTables();
  if (tables.length === 0) {
    log.warn("No tables found — nothing to reset.");
    return true;
  }

  note(
    tables.map((name) => `- ${name}`).join("\n"),
    `${tables.length} table(s) would be wiped (all rows, sequences reset to 1)`,
  );

  const confirmed = await askConfirm(
    "This permanently deletes ALL rows in ALL tables above — cannot be undone. Continue?",
    false,
  );
  if (!confirmed) {
    log.warn("Cancelled — nothing was touched.");
    return true;
  }

  await wipeAllData(tables);
  return true;
}

async function main() {
  intro("Play Padel · maintenance scripts");

  // Loops back here whenever the user backs out of the action choice itself,
  // OR out of loadEnv()'s "which database" choice right after — both are
  // safe to re-ask because neither has touched the Prisma client yet (see
  // this file's own header comment). Any other cancellation past that point
  // still exits the whole process, same as before.
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

    let proceeded: boolean;
    switch (action) {
      case "grant-admin":
        proceeded = await runGrantAdmin();
        break;
      case "revoke-admin":
        proceeded = await runRevokeAdmin();
        break;
      case "free-plan":
        proceeded = await runActivateFreePlan();
        break;
      case "welcome-period":
        proceeded = await runGrantWelcomePeriod();
        break;
      case "reset-data":
        proceeded = await runResetData();
        break;
    }

    // The action actually ran (its own database has been loaded) — done,
    // one action per process (see header comment). Otherwise the user
    // backed out at the "which database" step, so loop back and re-ask
    // which action to run.
    if (proceeded) break;
  }

  outro("Done.");
}

main().catch((err) => {
  log.error("Unexpected error:");
  console.error(err);
  process.exitCode = 1;
});
