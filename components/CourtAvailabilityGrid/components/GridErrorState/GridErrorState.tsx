import { CircleAlert } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function GridErrorState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load court availability</EmptyTitle>
        <EmptyDescription>
          Something went wrong while fetching this club&apos;s availability. Try
          again.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
