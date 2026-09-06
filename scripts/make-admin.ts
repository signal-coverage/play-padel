/**
 * make-admin — grant in-app admin access to a user by email.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  USAGE                                                                 │
 * │                                                                       │
 * │    npx tsx --env-file=.env.local scripts/make-admin.ts <email>         │
 * │                                                                       │
 * │  Swap --env-file for .env.preview / .env.prod to target that database. │
 * │  Or set DATABASE_URL yourself and run:  npm run admin:grant -- <email> │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Sets UserProfile.isAdmin = true — the real gate behind requireAdminProfile()
 * (lib/auth/adminProfile.ts) that unlocks the in-app admin dashboard. See
 * docs/ADMIN_BOOTSTRAP.md for the full picture, including the separate, legacy
 * Clerk publicMetadata.isAdmin mechanism, which this script does NOT touch.
 *
 * The target user must have signed in / completed onboarding at least once so
 * their UserProfile row exists. DATABASE_URL points at whichever environment
 * you choose — this script never assumes one.
 */

// NOTE: infrastructure/db/client is imported lazily inside main() so that
// `--help` / usage works without a DATABASE_URL (that module throws on load
// when it's missing).

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

const paint = (color: keyof typeof c, text: string) =>
  `${c[color]}${text}${c.reset}`;

function banner() {
  console.log();
  console.log(paint("cyan", "  ┌─────────────────────────────────────────┐"));
  console.log(
    paint("cyan", "  │") +
      paint("bold", "   make-admin · grant admin access       ") +
      paint("cyan", "│"),
  );
  console.log(paint("cyan", "  └─────────────────────────────────────────┘"));
  console.log();
}

function printUsage() {
  console.log(paint("bold", "  What this does"));
  console.log();
  console.log(
    paint(
      "dim",
      "    Sets UserProfile.isAdmin = true for one user, unlocking the",
    ),
  );
  console.log(
    paint(
      "dim",
      "    in-app admin dashboard. The user must have signed in / completed",
    ),
  );
  console.log(
    paint("dim", "    onboarding at least once so their profile row exists."),
  );
  console.log();

  console.log(paint("bold", "  To grant admin, run"));
  console.log();
  console.log(
    "    " +
      paint("green", "npx tsx --env-file=") +
      paint("cyan", "<env-file>") +
      paint("green", " scripts/make-admin.ts ") +
      paint("yellow", "<email>"),
  );
  console.log();
  console.log(paint("bold", "  Example"));
  console.log();
  console.log(
    "    " +
      paint("green", "npx tsx --env-file=.env.local scripts/make-admin.ts ") +
      paint("yellow", "jane@club.com"),
  );
  console.log();

  console.log(paint("bold", "  Pick the database with <env-file>"));
  console.log();
  console.log(
    `    ${paint("cyan", ".env.local")}     ${paint("dim", "local / development database")}`,
  );
  console.log(
    `    ${paint("cyan", ".env.preview")}   ${paint("dim", "preview deployment database")}`,
  );
  console.log(
    `    ${paint("cyan", ".env.prod")}      ${paint("dim", "production database — be careful")}`,
  );
  console.log();
  console.log(
    paint("dim", "  Alternative: set DATABASE_URL yourself, then run"),
  );
  console.log(paint("dim", "    npm run admin:grant -- <email>"));
  console.log();
}

/** Show which database we're about to touch, without leaking credentials. */
function describeTarget(url: string | undefined) {
  if (!url) return paint("red", "DATABASE_URL is not set");
  try {
    const { host, pathname } = new URL(url);
    return paint("bold", `${host}${pathname}`);
  } catch {
    return paint("yellow", "unparseable DATABASE_URL");
  }
}

const ok = (msg: string) => console.log(`  ${paint("green", "✓")} ${msg}`);
const fail = (msg: string) => console.error(`  ${paint("red", "✗")} ${msg}`);
const step = (msg: string) =>
  console.log(`  ${paint("cyan", "▸")} ${paint("dim", msg)}`);

async function main() {
  banner();

  const email = process.argv[2]?.trim();
  if (!email) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  console.log(
    `  ${paint("dim", "database")}  ${describeTarget(process.env.DATABASE_URL)}`,
  );
  console.log(`  ${paint("dim", "email")}     ${paint("bold", email)}`);
  console.log();

  const { prisma } = await import("../infrastructure/db/client");

  try {
    step("Looking up UserProfile…");
    const profile = await prisma.userProfile.findUnique({
      where: { email },
      select: { id: true, displayName: true, isAdmin: true },
    });

    if (!profile) {
      console.log();
      fail(`No UserProfile found for ${paint("bold", email)}.`);
      console.error(
        paint(
          "dim",
          "    They need to sign in / complete onboarding at least once first.",
        ),
      );
      console.log();
      process.exitCode = 1;
      return;
    }

    if (profile.isAdmin) {
      console.log();
      ok(
        `${paint("bold", profile.displayName)} (${email}) is ${paint("yellow", "already an admin")}. Nothing to do.`,
      );
      console.log();
      return;
    }

    step(`Granting admin to ${profile.displayName}…`);
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { isAdmin: true },
    });

    console.log();
    ok(
      `${paint("bold", profile.displayName)} (${email}) is now an ${paint("green", "admin")}.`,
    );
    console.log();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error();
  fail("Unexpected error:");
  console.error(err);
  console.error();
  process.exitCode = 1;
});
