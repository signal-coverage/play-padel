import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import { CLUB_STATUS_BADGE_VARIANT } from "./consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { AdminSearchClubResultsProps } from "./types";
import type { AdminSearchClubResult } from "../../types";

// Clickable (unlike the Player/Reservation result sections): routes the
// admin to /dashboard/settings/club?clubId=<id> via onSelectClub, which
// AdminSearchView wires to router.push. Same DataTable-driven
// loading/empty/list handling as AdminClubList
// (settings/club/_components/AdminClubSettingsView/components/AdminClubList) —
// not reused directly across folders per this repo's SRP-per-folder
// convention, but the same shape.
export function AdminSearchClubResults({
  clubs,
  isLoading,
  onSelectClub,
}: AdminSearchClubResultsProps) {
  const columns: DataTableColumn<AdminSearchClubResult>[] = [
    {
      key: "club",
      header: "Club",
      cell: (club) => (
        <div className="flex flex-col gap-1 py-0.5">
          <span className="font-medium">{club.name}</span>
          <span className="text-muted-foreground">{club.email}</span>
        </div>
      ),
      loadingCell: <Skeleton className="h-10 w-full" />,
    },
    {
      key: "status",
      header: "Status",
      cell: (club) => (
        <Badge
          variant={
            CLUB_STATUS_BADGE_VARIANT[club.status] ?? ("outline" as const)
          }
        >
          {club.status}
        </Badge>
      ),
      loadingCell: <Skeleton className="h-5 w-16 rounded-full" />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={clubs}
      rowKey={(club) => club.id}
      isLoading={isLoading}
      loadingLabel="Searching clubs…"
      emptyState={<StatusBox>No clubs found.</StatusBox>}
      onRowClick={(club) => onSelectClub(club.id)}
    />
  );
}
