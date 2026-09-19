import { CheckCircle2, Clock, CreditCard, LayoutGrid } from "lucide-react";

export { ease } from "@/lib/consts/animation";
export { default as backgroundImage } from "@/assets/images/top-view-paddle-tennis-court.jpg";

// Time-slot rows for the central "live court availability" mockup card.
// Times are locale-agnostic (24h clock, same in en/es) so they live here as
// plain data rather than translation keys — only the status label
// ("Reservada"/"Disponible") is copy and comes from
// messages/*.json's LandingHero.mockup.status{Booked,Available}.
export const MOCKUP_SLOTS = [
  { time: "09:00 – 10:30", status: "available" },
  { time: "10:30 – 12:00", status: "booked" },
  { time: "12:00 – 13:30", status: "available" },
  { time: "18:00 – 19:30", status: "booked" },
] as const;

// floatingCardKeys map to messages/*.json's
// LandingHero.floatingCards.<key> — order and icon only, copy lives in
// the translation messages. Positioned around the central mockup card,
// one per corner.
export const FLOATING_CARD_KEYS = [
  "booking",
  "payment",
  "courts",
  "nextSlot",
] as const;

export const FLOATING_CARD_ICONS: Record<
  (typeof FLOATING_CARD_KEYS)[number],
  typeof CheckCircle2
> = {
  booking: CheckCircle2,
  payment: CreditCard,
  courts: LayoutGrid,
  nextSlot: Clock,
};

// Absolute corner offsets for FLOATING_CARD_KEYS' four entries, in the same
// order (md:+ only — the collage wrapper's `md:contents` grid drops out of
// the box model at that breakpoint so each card positions against the
// collage's `relative` container instead of the grid it sits in below
// md:). A slight independent rotation on each mirrors the reference
// collage's hand-placed look.
export const FLOATING_CARD_POSITIONS = [
  "md:-top-6 md:-left-4 lg:-left-14 md:-rotate-3",
  "md:-top-10 md:-right-2 lg:-right-12 md:rotate-2",
  "md:-bottom-10 md:-left-2 lg:-left-16 md:rotate-2",
  "md:-bottom-4 md:-right-4 lg:-right-10 md:-rotate-2",
] as const;
