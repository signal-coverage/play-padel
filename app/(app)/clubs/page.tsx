import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

/**
 * Lists seeded clubs and their courts (spec: "Seed/Admin-Only Management" —
 * clubs/courts are admin/seed-managed only, no create/edit UI exists here).
 */
export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    include: { courts: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <p className="text-sm text-muted-foreground">
          Pick a court to see its availability and book a slot.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardHeader>
              <CardTitle>{club.name}</CardTitle>
              <CardDescription>
                {club.address} ·{" "}
                {club.depositRequired
                  ? `Deposit required (ARS ${club.depositAmountArs})`
                  : "No deposit required"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {club.courts.map((court) => (
                <Link
                  key={court.id}
                  href={`/clubs/${court.id}`}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {court.name}
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
