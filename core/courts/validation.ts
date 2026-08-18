export const MAX_COURT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Raster formats only — deliberately excludes image/svg+xml (and any other
// image/* subtype). SVGs can embed <script>/event handlers, and the upload
// route persists this same client-supplied type as the blob's serving
// Content-Type, so a broad "starts with image/" check would let an
// authenticated owner store a script-bearing "image" that executes if the
// blob URL is ever opened directly rather than rendered via <img>.
const ALLOWED_COURT_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Shared client/server guard for court photo uploads — kept here (rather
 * than duplicated in PhotoField and the upload route) so the client's
 * pre-flight check and the server's authoritative check can't drift out of
 * sync. Takes a duck-typed `{ type, size }` so both the browser's `File` and
 * the Node runtime's `File` (from `request.formData()`) satisfy it without
 * needing a shared class.
 */
export function validateCourtPhotoFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_COURT_PHOTO_TYPES.has(file.type)) {
    return "Please choose a JPEG, PNG, WebP, GIF, or AVIF image.";
  }
  if (file.size > MAX_COURT_PHOTO_SIZE_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}
