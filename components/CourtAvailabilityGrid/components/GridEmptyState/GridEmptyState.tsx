import { LayoutGrid } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function GridEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LayoutGrid />
        </EmptyMedia>
        <EmptyTitle>No courts to show</EmptyTitle>
        <EmptyDescription>
          There are no courts configured for this day yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
