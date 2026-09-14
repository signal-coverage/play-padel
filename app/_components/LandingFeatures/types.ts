import type { StaticImageData } from "next/image";

export interface FeatureTranslation {
  title: string;
  description: string;
  imageAlt: string;
}

export interface Feature extends FeatureTranslation {
  image: StaticImageData;
}
