# ERPFlow → Play Padel: Migration Analysis

This project started as a generic multi-tenant healthcare ERP boilerplate ("ERPFlow" — patients, professionals, consultations, dental/nutrition/psychology plugins). It's being repurposed into **Play Padel**, a padel court reservation app with two user types:

- **Regular users** — browse clubs/courts and see which appointment slots are free or locked, then reserve one (reservation flow to be detailed later).
- **Owners** — padel clubs managing their courts' availability, ideally in real time.

Current state: the public landing page (`app/page.tsx`, `app/_components/Landing*`) is **already rebranded** to Play Padel. The authenticated dashboard shell, auth pages, onboarding wizard, and the entire data model are **still ERPFlow** and need rework. No domain routes (patients/appointments/billing/etc.) were ever actually built — they exist only as nav links in `AppSidebar/consts.ts` pointing at pages that don't exist. This means there's very little real domain code to migrate; most of the work is deleting healthcare-specific scaffolding and building padel routes fresh on top of reusable generic infrastructure.

## KEEP — generic infrastructure, no changes needed

**Backend / data**
- `infrastructure/db/client.ts` — Prisma + Neon client singleton
- `proxy.ts` — Clerk `clerkMiddleware` route protection (acts as middleware)
- `hooks/use-auth.ts`, `providers/auth-provider.tsx` — Clerk user context wrapper
- `core/events/event-bus.ts` — generic in-process pub/sub event bus
- `core/audit/services/audit.service.ts`, `core/audit/types/index.ts` — generic audit log CRUD
- `lib/email/resend.ts` — Resend client wrapper
- `lib/notifications/dispatcher.ts` — persist-then-send dispatch pattern
- `lib/pdf/generate-receipt.ts` — generic PDF-from-invoice-shape generator
- `lib/utils/utils.ts`, `lib/utils/currency.ts`, `lib/consts/animation.ts`, `lib/consts/layout.ts`, `lib/consts/currencies.ts`
- `lib/generated/prisma/**` — generated client (regenerate after schema changes)
- `prisma.config.ts`, `next.config.ts`, `components.json`, `eslint.config.mjs`

**Frontend**
- `components/ui/**` — full shadcn/ui kit (~50 files: button, sheet, sidebar, dropdown-menu, select, dialog, table, tabs, calendar, carousel, chart, command, combobox, searchable-select, etc.) — zero domain coupling
- `components/theme-provider.tsx`, `components/theme-toggle.tsx`, `components/locator-setup.ts`
- `providers/query-provider.tsx` — React Query provider
- `hooks/use-mobile.ts`, `hooks/use-in-view.ts`
- `app/layout.tsx` — ClerkProvider/ThemeProvider/Toaster/Analytics wiring (metadata is already padel-branded)
- `app/invite-error/page.tsx`, `app/sso-callback/page.tsx` — generic Clerk auxiliary pages
- Landing page components (`app/_components/Landing*`) — already padel-branded; only needs a copy pass to align CTAs with the real reservation flow once it exists

## ADAPT — reusable pattern, needs a domain rewrite

**Data model** (`prisma/schema.prisma`)
- `Organization` → **Club**. Keep the shape (`Plan`, `OrganizationStatus` enums are reusable), rename fields as needed.
- `Professional` + `WorkingHours` → **Court** + **CourtAvailability**. `WorkingHours`'s `dayOfWeek`/`startTime`/`endTime` per-professional model maps almost directly onto a court's recurring weekly opening hours.
- `Appointment` → **Reservation**. Rename `patientId`/`patientName` → `userId`/`userName`, `professionalId`/`professionalName` → `courtId`/`courtName`. The status enum (`SCHEDULED/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW`) is directly reusable for reservations.
- `Invoice` / `Payment` → keep for reservation payments, but there's currently **no real payment gateway wired in** (no Stripe/Mercado Pago SDK in `package.json` — only the Prisma models and a manual `core/billing/services/billing.service.ts`). This needs to be built from scratch.
- `UserProfile.roleId` (`SystemRole`: `admin | staff | professional`) → remap to `owner | player` (add `staff` later only if clubs need sub-accounts). This is the single enum to change; it's referenced from `core/users/types`, `core/users/consts.ts` (`ROLE_LABEL`), and `core/users/schemas/user.schema.ts`.
- `Notification` — keep the model/dispatch pattern, rewrite `NotificationType` (`RESERVATION_REMINDER`, `RESERVATION_CANCELLED`, `PAYMENT_CONFIRMED` instead of the healthcare set).

**Backend modules** (`core/{domain}/`, per-domain `service` + `schema` + `types` + `consts` folders — this structural pattern is worth keeping)
- `core/appointments/**` — the booking engine (conflict-check, status transitions) is structurally the closest match to reservations; rename patient/professional references to user/court.
- `core/billing/**` — invoicing/payment recording logic is reusable, but needs a real gateway behind it.
- `core/notifications/**` — dispatch pattern reusable; `getPendingReminders`/`getPendingBirthdays` are patient/appointment-specific queries that need rewriting into reservation-reminder equivalents.
- `core/users/**` — generic profile CRUD, only the role enum needs remapping (see above).
- `core/events/types/index.ts` — event payload shapes are domain-specific; the bus itself is generic and could become the seam for real-time court-availability broadcasting.
- `lib/auth/require-org-profile.ts` — org/role resolution pattern is reusable, needs remap once roles change.
- `lib/email/templates/AppointmentReminder.tsx`, `AppointmentCancelled.tsx`, `InvoicePaid.tsx` — dispatch/render pattern reusable, copy needs a rewrite for reservations.

**Frontend**
- `app/dashboard/_components/AppSidebar/AppSidebar.tsx` — sidebar shell/logic is generic (shadcn `Sidebar`); the hardcoded "ERPFlow" logo mark and brand text need to change.
- `app/dashboard/_components/AppSidebar/consts.ts` — nav items (Patients/Professionals/Appointments/Billing/Reports/Audit/Custom Roles) need to become Courts/Reservations/Club (for owners) and a simpler nav for regular users.
- `app/dashboard/_components/AppHeader/*` — generic, fine as-is once routes are renamed.
- `app/dashboard/_components/DashboardGuard/*` — currently stubbed/commented out (references a `core/organizations` module that doesn't exist); needs real "owner has a club" vs "regular user" branching logic.
- `app/dashboard/layout.tsx`, `app/dashboard/page.tsx` — shell reusable; `page.tsx` is an empty placeholder that needs real per-role dashboard content.
- `app/onboarding/**` — the multi-step wizard mechanics (react-hook-form + zod, step indicator, motion transitions) are reusable; all copy/fields ("Clinic basics", legal name, tax id) are clinic-specific and the submit handler is currently a no-op stub. Needs a second branch: "I'm a player" (simple signup) vs "I'm a club owner" (club creation wizard).
- `app/(auth)/**` (login, signup, layout, `AuthLeftPanel`, `clerk-appearance.ts`) — Clerk wiring is generic; visuals/copy ("ERPFlow today") need rebranding, and post-auth redirect should branch by role.
- `components/ui/calendar.tsx` (react-day-picker) — only a bare date-picker today; usable as a building block but a real **court availability grid** component (showing free/locked slots) needs to be built — it doesn't exist yet anywhere in the codebase.

## DELETE — pure healthcare domain, no reuse value

**Data model**
- `Patient`, `Consultation`, `Treatment` models
- `NutritionPlan`, `NutritionSession`, `PsychologySession`, `PsychologyGoal` models (plugin-domain data, unused by any current service)
- `PluginRegistry` model — tied to the healthcare dental/nutrition/psychology plugin system; no plugin loader code exists in the repo (the `initialize-plugins` import is commented out). Delete unless a similar "club add-ons" plugin concept is planned for padel.
- Healthcare-only enums: `DocumentType`, `Gender`, `PatientStatus`, `TreatmentStatus`, `NutritionPlanStatus`, `SessionType`, `RiskLevel`, `GoalStatus`

**Code**
- `lib/email/templates/ClientBirthday.tsx` — patient-birthday concept doesn't map to padel
- `core/notifications/services/notifications.service.ts` → `getPendingReminders`, `getPendingBirthdays` — patient/appointment-specific query logic (effectively a full rewrite, not a patch)

**Assets**
- `.templates/**` — a bundle of ~20 unrelated vendored template mini-projects (dashboard-1..5, employees, leads, payrolls, rentals, task-management, etc.), each with its own `package.json`/lockfile. Not imported anywhere in the running app — safe to delete entirely, pure dead weight.

## Open decisions before starting the rewrite

1. **Custom roles**: `CustomRole` model exists in the schema and is joined in `requireOrgProfile()`, but there's no `core/permissions/*` module defining permission keys anywhere — it's scaffolded but unimplemented. Decide: hardcode two roles (`owner`/`player`) for the MVP, or keep the custom-roles machinery for future club-staff sub-accounts?
2. **Real-time court availability**: `ws` and `@types/ws` are installed but **completely unused** — no WebSocket server/client code exists anywhere. `@dnd-kit/*` is also installed but unused. Need to pick an approach (WebSocket, SSE, or polling via React Query) before building the owner's live availability view — see `docs/roadmap.md`.
3. **Payments**: no gateway SDK is installed. Given the app's likely primary market, Mercado Pago is a natural fit (a scaffolding skill for it is already available in this environment) — confirm before wiring anything.
