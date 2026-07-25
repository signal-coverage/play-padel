# Landing Carousel Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hover motion to the landing page's two carousel-style components and fix a badge-overflow bug, per `docs/superpowers/specs/2026-07-24-landing-carousel-polish-design.md`.

**Architecture:** Pure presentational changes — Tailwind class edits and one added wrapper `<span>` for text truncation, in two existing client components. No new state, no new dependencies, no data/logic changes.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4 (arbitrary values via `[...]`), framer-motion (already imported in both files), lucide-react icons.

## Global Constraints

- No new npm dependencies.
- No changes to `consts.ts` data files in either component's folder.
- No changes to scroll/carousel logic (`scrollByCard`, `goPrev`/`goNext`) — only markup position and styling.
- Dev server already runs on `http://localhost:3000` (confirmed running this session) — use it for visual verification via the Playwright MCP tools already available in this session (`browser_navigate`, `browser_evaluate`, `browser_take_screenshot`). There is no unit/component test framework in this repo for styling-only changes, so "test" in each task means a visual verification pass, not an automated assertion.

---

### Task 1: `LandingHow.tsx` — reposition arrows, add hover motion, fix badge overflow

**Files:**
- Modify: `app/_components/LandingHow/LandingHow.tsx`

**Interfaces:**
- Consumes: existing `scrollByCard(direction: 1 | -1)` function (line 13-15), existing `EVENTS` array from `./consts` (`{ title: string, image: StaticImageData }[]`), existing `shouldReduce` from `useReducedMotion()`.
- Produces: no new exports or functions — this task only changes JSX structure/classes inside `LandingInnovation()`.

- [ ] **Step 1: Move the arrow buttons into the header row**

Replace the header `div` (currently lines 19-35) and the card-loop's `i === 2` block (lines 41-62) so the arrows live in the header instead of the loop.

Current header (lines 19-35):
```tsx
      <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
        <motion.h2
          className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight max-w-2xl"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-[#A3A3A3]">
            Rally, Learn, and Celebrate with{" "}
          </span>
          <span className="text-[#111111]">Our Paddle Community Events</span>
        </motion.h2>
        <span className="shrink-0 inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold">
          Play Together, Grow Together
        </span>
      </div>
```

Replace with:
```tsx
      <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
        <motion.h2
          className="text-3xl md:text-[34px] font-bold leading-tight tracking-tight max-w-2xl"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="text-[#A3A3A3]">
            Rally, Learn, and Celebrate with{" "}
          </span>
          <span className="text-[#111111]">Our Paddle Community Events</span>
        </motion.h2>
        <div className="flex items-center gap-4 shrink-0">
          <span className="inline-flex items-center bg-[#111111] text-white rounded-full px-4 py-2 text-[13px] font-semibold">
            Play Together, Grow Together
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label="Scroll events left"
              className="w-10 h-10 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
            >
              <ArrowLeft size={15} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Scroll events right"
              className="w-10 h-10 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
            >
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Simplify the card loop — drop the `i === 2` splice, add hover motion + badge overflow fix**

Current loop body (lines 41-84):
```tsx
        {EVENTS.map((event, i) => (
          <div key={event.title} className="contents">
            {i === 2 && (
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => scrollByCard(-1)}
                  aria-label="Scroll events left"
                  className="w-10 h-10 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
                >
                  <ArrowLeft size={15} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCard(1)}
                  aria-label="Scroll events right"
                  className="w-10 h-10 rounded-full border border-[#D4D4D4] text-[#111111] flex items-center justify-center hover:border-[#111111] transition-colors"
                >
                  <ArrowRight size={15} strokeWidth={2} />
                </button>
              </div>
            )}

            <motion.div
              className="relative shrink-0 w-56 sm:w-64 aspect-3/5 rounded-3xl overflow-hidden"
              initial={shouldReduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease }}
            >
              <Image
                src={event.image}
                alt={event.title}
                fill
                sizes="256px"
                className="object-cover"
              />
              <span className="absolute left-4 bottom-4 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-3 py-1.5 text-xs font-semibold">
                {event.title}
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </span>
            </motion.div>
          </div>
        ))}
```

Replace with:
```tsx
        {EVENTS.map((event, i) => (
          <motion.div
            key={event.title}
            className="group relative shrink-0 w-56 sm:w-64 aspect-3/5 rounded-3xl overflow-hidden hover:shadow-xl transition-shadow duration-500"
            initial={shouldReduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
          >
            <Image
              src={event.image}
              alt={event.title}
              fill
              sizes="256px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
            />
            <span className="absolute left-4 bottom-4 max-w-[calc(100%-2rem)] inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-3 py-1.5 text-xs font-semibold">
              <span className="truncate min-w-0">{event.title}</span>
              <ArrowUpRight size={13} strokeWidth={2.5} className="shrink-0" />
            </span>
          </motion.div>
        ))}
```

Note: the card lift from the design (`-translate-y-1`) is dropped in favor of `hover:shadow-xl` only — `motion.div` already owns `initial`/`whileInView` transforms for the scroll-in animation, and stacking a CSS `hover:-translate-y-1` on the same element conflicts with framer-motion's inline `transform` style (framer-motion sets `transform` via inline style, which wins over a Tailwind hover utility). Keeping the zoom on the inner `Image` (a plain element framer-motion doesn't touch) avoids this conflict entirely, and the shadow-only lift still reads as "this card responds to hover."

- [ ] **Step 3: Verify no leftover unused imports**

`ArrowLeft` and `ArrowRight` are still used (now in the header). `ease` and `motion` are still used. No import line changes needed.

- [ ] **Step 4: Visual verification**

Run (if the dev server isn't already running on port 3000):
```bash
npm run dev
```

Then, using the Playwright MCP tools:
1. `browser_navigate` to `http://localhost:3000`
2. `browser_evaluate` to scroll the "Rally, Learn, and Celebrate" section into view (e.g. find `section#modules` or the heading text and `scrollIntoView`)
3. `browser_take_screenshot` — confirm: arrows now sit next to the "Play Together, Grow Together" badge in the header row, not mid-card-row.
4. `browser_evaluate` to hover a card (e.g. dispatch a `mouseenter`/use `element.dispatchEvent` or Playwright's hover via `page.hover`) and screenshot again — confirm the image zooms and the card shows a shadow.
5. Confirm the arrow buttons still work: click "Scroll events right" via `browser_click` and verify `scrollRef`'s container scrolls (via `browser_evaluate` reading `scrollLeft` before/after, expecting it to increase by ~280).

Expected: arrows relocated, hover zoom+shadow visible, scroll buttons still functional.

- [ ] **Step 5: Commit**

```bash
git add app/_components/LandingHow/LandingHow.tsx
git commit -m "style: reposition carousel arrows and add hover motion to event cards"
```

---

### Task 2: `LandingFeatures.tsx` — hover motion + press feedback + centered badge fix on the "next facility" button

**Files:**
- Modify: `app/_components/LandingFeatures/LandingFeatures.tsx`

**Interfaces:**
- Consumes: existing `goNext` handler (line 17), existing `next` object (`FACILITIES[(index + 1) % total]`, shape `{ title: string, image: StaticImageData }`).
- Produces: no new exports — JSX/class changes only, scoped to the button at lines 90-106.

- [ ] **Step 1: Add hover/press motion and center the badge**

Current (lines 90-106):
```tsx
            <button
              type="button"
              onClick={goNext}
              className="relative shrink-0 w-40 h-32 rounded-2xl overflow-hidden"
            >
              <Image
                src={next.image}
                alt={next.title}
                fill
                sizes="160px"
                className="object-cover"
              />
              <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-3 py-1.5 text-xs font-semibold">
                {next.title}
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </span>
            </button>
```

Replace with:
```tsx
            <button
              type="button"
              onClick={goNext}
              className="group relative shrink-0 w-40 h-32 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-500 active:scale-95"
            >
              <Image
                src={next.image}
                alt={next.title}
                fill
                sizes="160px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
              />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-3 max-w-[calc(100%-1.5rem)] inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[#111111] rounded-full px-3 py-1.5 text-xs font-semibold">
                <span className="truncate min-w-0">{next.title}</span>
                <ArrowUpRight size={13} strokeWidth={2.5} className="shrink-0" />
              </span>
            </button>
```

Note: `active:scale-95` goes on the outer `button` (not the image) so the whole control presses down, not just the photo — this is the "real control" press feedback called for in the design, distinct from the hover-only zoom on the image.

- [ ] **Step 2: Visual verification**

Using the Playwright MCP tools (dev server already running on `http://localhost:3000`):
1. `browser_navigate` to `http://localhost:3000`
2. Scroll the "World-Class Paddle Facilities" section into view.
3. `browser_take_screenshot` — confirm the next-facility title badge is now horizontally centered at the bottom of the thumbnail (not flush left).
4. `browser_evaluate` to temporarily swap in a long title (e.g. `document.querySelector('button[onclick]... ')` isn't reliable for React — instead, verify via computed style: query the badge `span`, confirm `getComputedStyle(span).maxWidth` is set and the inner title `span` has `overflow: hidden` and `text-overflow: ellipsis` from `truncate`) to confirm the overflow fix is structurally in place. Cross-check against the actual longest title in `FACILITIES` ("Beginner-Friendly Courts") by clicking "next" (`browser_click`) until it's the displayed `next.title`, then screenshot to confirm it stays within the thumbnail bounds, centered, truncating if needed.
5. Hover the button (Playwright `hover`) and screenshot — confirm image zoom + shadow.

Expected: badge centered and bounded, long titles truncate instead of overflowing, hover zoom/shadow present.

- [ ] **Step 3: Commit**

```bash
git add app/_components/LandingFeatures/LandingFeatures.tsx
git commit -m "style: center next-facility badge, fix overflow, add hover/press motion"
```
