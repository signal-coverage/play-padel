import { CalendarClock, ShieldCheck, Users, Wallet } from "lucide-react";
import highAnglePaddleTennisField from "@/assets/images/high-angle-paddle-tennis-field.jpg";
import topViewPaddleTennisCourt from "@/assets/images/top-view-paddle-tennis-court.jpg";
import peoplePlayingPadleTennisInside from "@/assets/images/people-playing-padle-tennis-inside.jpg";
import mixedPadelMatchIndoor from "@/assets/images/mixed-padel-match-padel-court-indoor.jpg";

export { ease } from "@/lib/consts/animation";

// Slide order matches messages/*.json's LandingAbout.imageAlts (matched
// positionally) — alt text lives in the translation messages, not here.
export const ABOUT_IMAGES = [
  highAnglePaddleTennisField,
  topViewPaddleTennisCourt,
  peoplePlayingPadleTennisInside,
  mixedPadelMatchIndoor,
];

// One icon per chip, in the same order as messages/*.json's
// LandingAbout.chips (matched positionally) — label text lives in the
// translation messages.
export const CHIP_ICONS = [CalendarClock, Wallet, Users, ShieldCheck];
