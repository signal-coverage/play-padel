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
- **Terms acceptance is validated but not persisted** — see [DATABASE.md](DATABASE.md).

None of these gaps are unique to this app at its current stage, but they should be addressed before any public/production launch beyond trusted users.
