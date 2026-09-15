import type { Feature, FeatureTranslation } from "./types";
import { FEATURE_IMAGES } from "./consts";

// Zips the static per-feature images (consts.ts) with the translated
// title/description/imageAlt (messages/*.json), matched positionally.
export function buildFeatures(translations: FeatureTranslation[]): Feature[] {
  return translations.map((translation, index) => ({
    ...translation,
    image: FEATURE_IMAGES[index],
  }));
}
