import type { CourtPhotoPreviewProps } from "./types";

export const THUMBNAIL_SIZE_CLASSES: Record<
  NonNullable<CourtPhotoPreviewProps["size"]>,
  string
> = {
  sm: "h-10 w-10",
  lg: "h-24 w-24",
};
