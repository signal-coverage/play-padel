import type { StaticImageData } from "next/image";

export interface Testimonial {
  quoteLead: string;
  quoteRest: string;
  name: string;
  role: string;
  avatarFrom: string;
  avatarTo: string;
  initials: string;
  avatar?: StaticImageData;
}
