# Play Padel: Suggested Roadmap

Based on what's confirmed so far: two user types (regular users who reserve courts, owners who manage a club's courts), a list-based UI showing free/locked slots, and real-time updates for owners "if possible." The reservation flow itself hasn't been detailed yet, so later steps here are intentionally coarse and will need revisiting once that's defined.

See `docs/migration-analysis.md` for the full file-by-file delete/adapt/keep breakdown referenced below.

## 1. Strip the healthcare domain
- Delete the models, enums, and files listed under **DELETE** in `migration-analysis.md` (`Patient`, `Consultation`, `Treatment`, `NutritionPlan*`, `PsychologySession*`, `PluginRegistry`, related enums, `ClientBirthday` template, `.templates/**`).
- Regenerate the Prisma client after trimming the schema.

## 2. Rework the data model
- `Organization` → `Club`, `Professional` + `WorkingHours` → `Court` + `CourtAvailability`, `Appointment` → `Reservation` (see field-level detail in `migration-analysis.md`).
- Remap `SystemRole` to `owner | player` (defer `staff` sub-accounts and the `CustomRole` machinery unless a concrete need shows up).

## 3. Rebrand the authenticated shell
- `AppSidebar.tsx` (logo + brand text), `AppSidebar/consts.ts` (nav items), `app/(auth)/**` copy, `app/onboarding/**` copy — remove every remaining "ERPFlow" reference and replace the clinic-onboarding wizard with two branches: player signup (simple) vs. club owner signup (club + first court creation).
- Wire `DashboardGuard` to real "does this user own a club yet" logic instead of the current stubbed-out placeholder.

## 4. Build the core padel modules (following the existing `core/{domain}` service/schema/types/consts pattern)
- `core/clubs` — club CRUD for owners.
- `core/courts` — court CRUD + availability template (recurring weekly hours, rename from `WorkingHours`).
- `core/reservations` — adapted from `core/appointments`; this is where the not-yet-defined booking flow will live once specced.

## 5. Regular-user experience
- Public/authenticated list view: clubs → courts → free/locked slots. `components/ui/calendar.tsx` is only a bare date-picker today — a real **availability grid** component needs to be built (nothing like it exists yet).

## 6. Owner experience
- Per-club dashboard: courts and their slot grid (free/locked), ideally live-updating.
- **Real-time decision needed**: `ws`/`@types/ws` are installed but nothing uses them yet, and there's no WebSocket server/client code anywhere in the repo. Before building this, decide between:
  - WebSocket server (the dependency is already there, but nothing is wired — real work either way)
  - Server-Sent Events (simpler one-way push, fits "slot became locked" style updates well)
  - Polling via React Query (`refetchInterval`) — lowest effort, good enough for an MVP, easy to upgrade later
  - Recommendation: start with React Query polling for the MVP, keep `core/events/event-bus.ts` as the seam so it can be swapped for a real push mechanism later without touching UI code.

## 7. Reservation flow
- Deliberately left coarse — come back to this once the actual reservation rules are defined (lock duration, cancellation policy, who can see whose reservations, etc.). `core/appointments` gives a working conflict-check/status-transition skeleton to adapt.

## 8. Payments
- No gateway is wired in today. Once the reservation flow is defined, decide whether payment happens at booking time or later, then integrate a real gateway (Mercado Pago is a strong default given the domain and there's already a scaffolding skill available for it in this environment) — replace the current manual `core/billing/services/billing.service.ts` recording with real charge/webhook handling.

## 9. Notifications
- Rewrite `NotificationType` and the email templates (`AppointmentReminder` → reservation reminder, `AppointmentCancelled` → reservation cancelled, add payment-confirmed) once the reservation flow is defined — the dispatch pattern itself doesn't need to change.

## Suggested next concrete step
Steps 1–3 (strip healthcare domain, rework schema, rebrand shell) are mechanical and can start immediately without any further product decisions. Step 4 onward needs the reservation flow fleshed out first — worth locking that down before writing `core/reservations`.
