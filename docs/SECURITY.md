# Security

## Implemented

- **Authentication** — Clerk (`proxy.ts` middleware protects every route except an explicit public allowlist; see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Server-side authorization** — owner-only routes resolve `clubId` from the caller's own `UserProfile` via `requireOwnerClub()` (`app/api/clubs/_lib/require-owner.ts`); a client can never supply or override which club it acts on.
- **Reservation conflict validation** — booking overlap checks happen server-side in `core/reservations/services/reservations.service.ts`, not just in the UI.
- **Self-cancel cutoff** — the 2-hour cancellation cutoff (`canSelfCancel`) is computed and enforced server-side; the client only reads the resulting boolean to show/hide the Cancel button.
- **Soft deletes** — courts are deactivated (`active: false`, `deletedAt`, `deletedBy`) rather than hard-deleted, preserving historical reservation data.
- **Rate limiting** (2026-09-06) — Vercel WAF, via the `@vercel/firewall` SDK (`lib/security/rateLimit.ts`). Hobby plan allows exactly one rate-limit rule per project (dashboard-configured, ID `api-guard`); every protected route shares it and gets its own effective budget by namespacing `rateLimitKey` as `` `${route}:${userId}` ``. Applied to `POST /api/onboarding`, `POST /api/player/reservations`, `POST /api/player/waitlist`, and `GET /api/player/clubs` (browse/availability — the scraping-risk target called out below).
- **Bot/CAPTCHA protection** (2026-09-06) — Vercel BotID (`lib/security/botGuard.ts`, Basic tier, free on all plans). Wired into the three mutating form-submission-style endpoints: `POST /api/onboarding`, `POST /api/player/reservations`, `POST /api/player/waitlist`. Deliberately NOT on `GET /api/player/clubs` (a 15s-polling read endpoint, not a form submission — rate limiting alone covers it). Deep Analysis (Pro-only, $1/1000 calls) is not enabled — Basic is sufficient for the traffic this app currently sees.

- **CSRF** (reviewed 2026-09-06, no code change needed) — no real gap found. Zero Server Actions exist in this codebase (confirmed via repo-wide search), so every mutating endpoint is a Route Handler behind Clerk session auth, enforced twice (`proxy.ts`'s `auth.protect()` + each route's own `requireAuthUser()`). Clerk's session cookie is `SameSite=Lax` (confirmed against Clerk's own docs) — browsers withhold a `Lax` cookie on a cross-site POST (fetch or auto-submitting `<form>`), which is the standard defense against classic CSRF and requires no app code. The public webhook/cron routes authenticate via HMAC signature / bearer secret, not cookies, so CSRF (which exploits ambient browser credentials) doesn't apply to them. Residual risk is limited to browsers predating `SameSite` defaults (~2020), which all major browsers now treat as `Lax` even when unset.

## Known gaps

- **No API throttling on Clerk's own auth endpoints from our side** — not needed: Clerk's platform already rate-limits sign-in creation/attempts natively.

Corrected (2026-09-04): terms acceptance IS persisted — `UserProfile.acceptedTermsAt` is stamped by `app/api/onboarding/route.ts`; see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [DATABASE.md](DATABASE.md). This doc previously listed that as an open gap; it was already fixed as of 2026-08-15 per [BACKLOG.md](BACKLOG.md).

This app has real, active users and live Mercado Pago payments moving through it today — these gaps are not a future/pre-launch concern, they are current exposure on a live system. See the prioritized (P0-first) list in [BACKLOG.md](BACKLOG.md) for how these rank against the app's other open items.
