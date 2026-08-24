export type CourtPhotoPreviewProps = {
  photoUrl?: string;
  courtName: string;
  /** Thumbnail size — "lg" (24x24, ClubCourtsPanel's original preview-column
   * size) is the default so existing call sites keep their exact prior
   * appearance; "sm" (10x10) fits a dense table row like CourtsTable's. */
  size?: "sm" | "lg";
};
