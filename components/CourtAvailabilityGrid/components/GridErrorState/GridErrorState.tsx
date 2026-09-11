import { BouncingBall } from "@/components/BouncingBall";
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
          <BouncingBall
            size={24}
            amplitude={8}
            fill="var(--destructive)"
            stroke="color-mix(in oklch, var(--destructive) 70%, black)"
          />
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
