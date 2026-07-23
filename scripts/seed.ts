/**
 * Admin-only seed data (spec: "Seed/Admin-Only Management" — no self-service
 * UI exists for Club/Court in v1, so this script is the only way to create
 * them). Seeds one free club and one deposit-required club, each with a
 * single court, so the booking flow is actually usable end to end.
 *
 * Run with: `npx prisma db seed` (wired via `migrations.seed` in
 * prisma.config.ts).
 */
import { config } from "dotenv";

// `npx prisma db seed` spawns this script as its own process, which does not
// inherit the Prisma CLI's dotenv loading — mirror prisma.config.ts's
// env-loading order so `DATABASE_URL` is defined here too.
//
// NOTE: `../lib/prisma` is imported dynamically (not via a static top-level
// `import`) because ES module imports are hoisted above ordinary statements.
// A static import would run `lib/prisma.ts` (which reads
// `process.env.DATABASE_URL` at module-init time) BEFORE the `config()` calls
// below executed, leaving `DATABASE_URL` undefined and producing a confusing
// "client password must be a string" SASL error from `pg`.
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { prisma } = await import("../lib/prisma");

  const freeClub = await prisma.club.upsert({
    where: { id: "seed-free-club" },
    create: {
      id: "seed-free-club",
      name: "Club Palermo Padel",
      address: "Av. Santa Fe 4200, CABA",
      timezone: "America/Argentina/Buenos_Aires",
      openTime: "08:00",
      closeTime: "23:00",
      depositRequired: false,
      depositAmountArs: null,
    },
    update: {},
  });

  await prisma.court.upsert({
    where: { id: "seed-free-court-1" },
    create: {
      id: "seed-free-court-1",
      clubId: freeClub.id,
      name: "Cancha 1",
      slotMinutes: 90,
    },
    update: {},
  });

  const depositClub = await prisma.club.upsert({
    where: { id: "seed-deposit-club" },
    create: {
      id: "seed-deposit-club",
      name: "Club Belgrano Padel",
      address: "Av. Cabildo 2100, CABA",
      timezone: "America/Argentina/Buenos_Aires",
      openTime: "08:00",
      closeTime: "23:00",
      depositRequired: true,
      depositAmountArs: 5000,
    },
    update: {},
  });

  await prisma.court.upsert({
    where: { id: "seed-deposit-court-1" },
    create: {
      id: "seed-deposit-court-1",
      clubId: depositClub.id,
      name: "Cancha 1",
      slotMinutes: 90,
    },
    update: {},
  });

  console.log("Seeded clubs:", freeClub.name, "/", depositClub.name);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  const { prisma } = await import("../lib/prisma");
  await prisma.$disconnect();
  process.exitCode = 1;
});
