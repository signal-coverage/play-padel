"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { BouncingBall } from "@/components/BouncingBall";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { validateCourtPhotoFile } from "@/core/courts/validation";
import { cn } from "@/lib/utils/utils";
import { useUploadCourtPhoto } from "../../../../hooks";
import type { PhotoFieldProps } from "./types";

export function PhotoField({
  courtId,
  value,
  onChange,
  onFileStaged,
}: PhotoFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const uploadPhoto = useUploadCourtPhoto();

  // Local object URLs are only ever created for a staged (not-yet-uploaded)
  // file, so they must be revoked on unmount/replacement to avoid leaking
  // memory — the persisted `value` URL is a real remote URL, never revoked.
  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
    };
  }, [stagedPreviewUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file later (e.g. after fixing a rejected one).
    event.target.value = "";
    if (!file) return;

    const validationError = validateCourtPhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (!courtId) {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
      setStagedPreviewUrl(URL.createObjectURL(file));
      onFileStaged?.(file);
      return;
    }

    try {
      const { photoUrl } = await uploadPhoto.mutateAsync({ courtId, file });
      onChange(photoUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    }
  }

  const previewUrl = stagedPreviewUrl ?? value;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-muted">
        {previewUrl ? (
          // Vercel Blob URLs (and local blob: object URL previews) aren't
          // known ahead of time, so next/image's remotePatterns allowlist
          // doesn't fit here — same tradeoff ClubCourtsPanel makes.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <input
          id="court-photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={handleFileChange}
          disabled={uploadPhoto.isPending}
          aria-invalid={!!error}
          className="sr-only"
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            "w-fit",
            // <label> has no native `disabled` state for Tailwind's
            // `disabled:` variant to key off — mirror the sibling input's
            // disabled look manually so it doesn't look clickable while a
            // disabled input silently ignores the label's click.
            uploadPhoto.isPending && "pointer-events-none opacity-50",
          )}
        >
          <label htmlFor="court-photo-upload">Upload picture</label>
        </Button>
        {uploadPhoto.isPending && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BouncingBall size={14} amplitude={4} />
            Uploading…
          </span>
        )}
        <FieldError errors={error ? [{ message: error }] : []} />
      </div>
    </div>
  );
}
