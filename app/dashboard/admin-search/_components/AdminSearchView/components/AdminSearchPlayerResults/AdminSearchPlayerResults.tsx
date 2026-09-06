import { DataTable } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import type { DataTableColumn } from "@/components/DataTable";
import type { AdminSearchPlayerResultsProps } from "./types";
import type { AdminSearchPlayerResult } from "../../types";

// Not clickable — no per-player deep-link surface exists anywhere in this
// app yet, so this is display-only (no onRowClick, unlike
// AdminSearchClubResults).
export function AdminSearchPlayerResults({
  players,
  isLoading,
}: AdminSearchPlayerResultsProps) {
  const columns: DataTableColumn<AdminSearchPlayerResult>[] = [
    {
      key: "player",
      header: "Player",
      cell: (player) => (
        <div className="flex flex-col gap-1 py-0.5">
          <span className="font-medium">{player.displayName}</span>
          <span className="text-muted-foreground">{player.email}</span>
        </div>
      ),
      loadingCell: <Skeleton className="h-10 w-full" />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={players}
      rowKey={(player) => player.id}
      isLoading={isLoading}
      loadingLabel="Searching players…"
      emptyState={<StatusBox>No players found.</StatusBox>}
    />
  );
}
