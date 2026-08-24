import type { StaticImageData } from "next/image";
import carpetSurfaceBlue from "@/assets/images/carpet_surface_blue.png";
import carpetSurfaceGreen from "@/assets/images/carpet_surface_green.png";
import carpetSurfaceTerracotta from "@/assets/images/carpet_surface_terracotta.png";
import carpetSurfaceBlack from "@/assets/images/carpet_surface_black.png";
import carpetSurfaceFuchsia from "@/assets/images/carpet_surface_fuchsia.png";
import carpetSurfacePurple from "@/assets/images/carpet_surface_purple.png";
import concreteSurfaceImage from "@/assets/images/carpet_surface_concrete.png";

// Neutral render used (with a CSS mix-blend-mode tint) for any court color
// that isn't one of the presets below — e.g. a custom color picked via
// ColorField's native <input type="color">.
export const CARPET_SURFACE_FALLBACK_IMAGE = carpetSurfaceBlue;

// Its own dedicated render — see SurfacePreview.tsx.
export const CONCRETE_SURFACE_IMAGE = concreteSurfaceImage;

// Real per-color renders, keyed lowercase (the native color input returns
// lowercase hex) — must match COURT_COLOR_OPTIONS in
// CourtFormSheet/components/ColorField/consts.ts exactly.
export const CARPET_SURFACE_IMAGE_BY_COLOR: Record<string, StaticImageData> = {
  "#2563eb": carpetSurfaceBlue,
  "#2d8a60": carpetSurfaceGreen,
  "#b5651d": carpetSurfaceTerracotta,
  "#18181b": carpetSurfaceBlack,
  "#d6336c": carpetSurfaceFuchsia,
  "#7c3aed": carpetSurfacePurple,
};
