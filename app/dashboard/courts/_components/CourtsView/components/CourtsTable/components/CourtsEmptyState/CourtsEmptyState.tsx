import Image from "next/image";
import { Empty, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import courtsEmptyImage from "@/assets/images/paddle-tennis-white-line.jpg";
import { COURTS_EMPTY_STATE_MESSAGE } from "./consts";

// Rendered by CourtsTable as DataTable's `emptyState` for the no-courts
// case. DataTable returns `emptyState` unwrapped (no height-filling wrapper
// of its own) when there are zero rows, so this component carries its own
// "fill the container" sizing instead of relying on a class passed down
// from above — see CourtsTable.tsx.
export function CourtsEmptyState() {
  return (
    <Empty className="min-h-0 flex-1">
      <EmptyMedia className="relative size-64 overflow-hidden rounded-2xl">
        <Image
          src={courtsEmptyImage}
          alt=""
          fill
          className="object-cover"
          sizes="512px"
        />
      </EmptyMedia>
      <EmptyDescription>{COURTS_EMPTY_STATE_MESSAGE}</EmptyDescription>
    </Empty>
  );
}
