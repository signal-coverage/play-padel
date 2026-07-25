# Landing carousel polish — design

## Context

Two horizontal-scroll/carousel components on the landing page (`app/_components/LandingHow/LandingHow.tsx` and `app/_components/LandingFeatures/LandingFeatures.tsx`) had two issues:

1. Static, no hover feedback — cards/preview buttons felt flat.
2. `LandingHow`'s scroll arrows were spliced into the card list at a hardcoded index (`i === 2`), landing awkwardly mid-row.
3. Both components render a title badge as `absolute left-* bottom-*` with no width cap — a long title (e.g. "Beginner-Friendly Courts", "Paddle & Breakfast Meet-Up") grows unbounded and can spill over the right edge of the image/button.

## Design

### A. `LandingHow.tsx`

- Move the prev/next arrow buttons out of the `EVENTS.map` loop (removing the `i === 2` conditional and the `contents` wrapper div) into the section header row, placed after the "Play Together, Grow Together" badge. Same buttons/handlers, new location only.
- Each card (`motion.div` wrapping the `Image`): on hover, image scales to `1.08` (clipped by the existing `rounded-3xl overflow-hidden`), card lifts via `-translate-y-1` with `shadow-xl`, transition `duration-500 ease-out`. Purely decorative — no `cursor-pointer`, no link, no click handler added.
- Title badge: constrain with `max-w-[calc(100%-1.5rem)]`; wrap the title text in its own `<span className="truncate min-w-0">` so it ellipsizes instead of pushing the badge wider; icon gets `shrink-0` so it never gets squeezed by the truncating text.

### B. `LandingFeatures.tsx` — "next facility" preview button

- Same hover treatment as (A): image `scale-[1.08]` + button lift/shadow, `duration-500 ease-out`. Additionally `active:scale-95` on press, since this button is a real control (`onClick={goNext}`), not decorative.
- Badge is horizontally centered instead of left-anchored: `left-1/2 -translate-x-1/2 bottom-3` (was `left-3 bottom-3`). Still capped with `max-w-[calc(100%-1.5rem)]` and `truncate min-w-0` on the title text span (with `shrink-0` on the arrow icon) as a safety net for titles too long to fit even centered — this is the button the user specifically wants centered, unlike (A)'s bottom-left badges.

## Out of scope

- No changes to `LandingFeatures.tsx`'s main prev/next arrow buttons (already fixed for dark-mode color contrast in a prior change) — those aren't part of this polish pass.
- Cards remain non-clickable/decorative in `LandingHow.tsx` — no event detail routes exist yet.
- No changes to carousel/scroll logic, data (`consts.ts`), or animation timing library (`framer-motion` `ease` import stays as-is).

## Files touched

- `app/_components/LandingHow/LandingHow.tsx`
- `app/_components/LandingFeatures/LandingFeatures.tsx`
