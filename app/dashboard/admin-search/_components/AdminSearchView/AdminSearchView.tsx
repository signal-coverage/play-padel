"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { StatusBox } from "@/components/StatusBox";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "./consts";
import { useAdminSearch, useDebouncedValue } from "./hooks";
import { AdminSearchClubResults } from "./components/AdminSearchClubResults";
import { AdminSearchPlayerResults } from "./components/AdminSearchPlayerResults";
import { AdminSearchReservationResults } from "./components/AdminSearchReservationResults";

/**
 * Admin-only global support tool: search across clubs, players, and
 * reservations by name/email/id in one place (see
 * app/api/admin/search/route.ts). The raw input is debounced before it ever
 * reaches the query, so typing doesn't fire one request per keystroke (see
 * hooks.ts's useDebouncedValue); an empty/whitespace-only debounced query
 * renders a distinct "start typing" state instead of calling the API at all.
 */
export function AdminSearchView() {
  const router = useRouter();
  const [rawQuery, setRawQuery] = useState("");
  const debouncedQuery = useDebouncedValue(rawQuery, ADMIN_SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const { data, isLoading } = useAdminSearch(trimmedQuery);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Search
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Search across every club, player, and reservation on the platform.
        </p>
      </div>

      <Input
        placeholder="Search by name, email, or id…"
        value={rawQuery}
        onChange={(event) => setRawQuery(event.target.value)}
        aria-label="Search"
      />

      {!trimmedQuery ? (
        <StatusBox>
          Start typing to search across clubs, players, and reservations.
        </StatusBox>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Clubs
            </h2>
            <AdminSearchClubResults
              clubs={data?.clubs ?? []}
              isLoading={isLoading}
              onSelectClub={(clubId) =>
                router.push(`/dashboard/settings/club?clubId=${clubId}`)
              }
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Players
            </h2>
            <AdminSearchPlayerResults
              players={data?.players ?? []}
              isLoading={isLoading}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Reservations
            </h2>
            <AdminSearchReservationResults
              reservations={data?.reservations ?? []}
              isLoading={isLoading}
            />
          </section>
        </div>
      )}
    </div>
  );
}
