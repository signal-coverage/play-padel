# Security

## Implemented

- **Authentication** — Clerk (`proxy.ts` middleware protects every route except an explicit public allowlist; see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Server-side authorization** — owner-only routes resolve `clubId` from the caller's own `UserProfile` via `requireOwnerClub()` (`app/api/clubs/_lib/require-owner.ts`); a client can never supply or override which club it acts on.
- **Reservation conflict validation** — booking overlap checks happen server-side in `core/reservations/services/reservations.service.ts`, not just in the UI.
- **Self-cancel cutoff** — the 2-hour cancellation cutoff (`canSelfCancel`) is computed and enforced server-side; the client only reads the resulting boolean to show/hide the Cancel button.
- **Soft deletes** — courts are deactivated (`active: false`, `deletedAt`, `deletedBy`) rather than hard-deleted, preserving historical reservation data.

## Known gaps

- **No rate limiting** anywhere in the app or middleware — confirmed via repo-wide search, no hits outside this document.
- **No CSRF-specific review** has been done (Next.js Server Actions/route handlers have some built-in protections, but nothing custom has been audited or added).
- **No API throttling** on any route.
- **No CAPTCHA/bot protection** on public forms (signup, onboarding).

Corrected (2026-09-04): terms acceptance IS persisted — `UserProfile.acceptedTermsAt` is stamped by `app/api/onboarding/route.ts`; see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [DATABASE.md](DATABASE.md). This doc previously listed that as an open gap; it was already fixed as of 2026-08-15 per [BACKLOG.md](BACKLOG.md).

This app has real, active users and live Mercado Pago payments moving through it today — these gaps are not a future/pre-launch concern, they are current exposure on a live system. See the prioritized (P0-first) list in [BACKLOG.md](BACKLOG.md) for how these rank against the app's other open items.
