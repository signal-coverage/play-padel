# Architecture

## Request flow

```text
Client (Next.js, App Router)
      │
      ▼
proxy.ts (Clerk middleware — protects every route except an explicit public allowlist)
      │
      ▼
API Routes (app/api/**/route.ts)
      │
      ▼
core/{domain}/services/*.ts
 ├── clubs
 ├── courts
 ├── reservations
 ├── users
 ├── billing        (reachable via the player reservations route and the Mercado Pago webhook)
 ├── notifications  (cancellation/payment/reminder emails all wired; reminder via Vercel Cron)
 └── audit           (wired into reservations/courts/clubs/onboarding; full UI at /dashboard/audit-logs)
      │
      ▼
Prisma → Neon Postgres

External services
 ├── Clerk   — authentication
 ├── Resend  — transactional email
 └── Vercel Cron — triggers /api/cron/notifications daily (see vercel.json)
```

Each `core/{domain}` folder follows the same internal shape: `services/`, `schemas/` (Zod), `types/`, `consts.ts`. API routes are thin — they authenticate, parse/validate input, and delegate straight to a service function; no business logic lives in `app/api`.

See [API.md](API.md) for the full route list and [DATABASE.md](DATABASE.md) for the schema.

## Routes

- **Public**: `/` (landing), `/login`, `/signup`, `/sso-callback`, `/invite-error`, `/onboarding`
- **Player**: `/dashboard`, `/dashboard/browse`, `/dashboard/browse/payment-return`, `/dashboard/my-reservations`, `/dashboard/players`
- **Owner**: `/dashboard`, `/dashboard/courts`, `/dashboard/reservations`, `/dashboard/settings/club`, `/dashboard/audit-logs`

Route protection (`proxy.ts`): Clerk middleware protects every route except the public page list above and two non-Clerk API routes that authenticate themselves instead — `/api/webhooks/*` (signature-verified) and `/api/cron/*` (bearer `CRON_SECRET`, called by Vercel Cron, which has no Clerk session). `/api/webhooks/mercadopago` (the Mercado Pago payment webhook) is covered by the existing `/api/webhooks(.*)` allowlist entry, so no `proxy.ts` change was needed to add it. See [API.md](API.md) for the HTTP API surface.

## Multi-tenancy

Each `Club` is an isolated tenant. Every owner-facing API route resolves the caller's `clubId` **server-side** from their own `UserProfile` (via `requireOwnerClub()` in `app/api/clubs/_lib/require-owner.ts`) — a client can never supply or override which club it acts on. Players are not scoped to a club; they can browse all active clubs and book at any of them.

- `Club` — the tenant boundary. Owns `Court`, `Reservation`, `Invoice`, `Payment`, and the `UserProfile`(s) with `role: "owner"` for that club.
- `UserProfile` — optionally belongs to a `Club` (owners always do; players never do).

## Folder structure

- `app/` — routes (App Router): public pages, `(auth)` pages, and the authenticated `dashboard/` area, split into player and owner views
- `app/api/` — route handlers; thin wrappers around `core/` services
- `core/` — domain logic per business area
- `components/ui/` — shadcn/ui primitives
- `components/` — shared, non-domain-specific components
- `lib/` — cross-cutting utilities (email, PDF generation, notification dispatch, currency/animation/layout consts)
- `prisma/` — database schema
- `infrastructure/db/` — Prisma + Neon client singleton
- `providers/`, `hooks/` — React context providers and shared hooks (auth, query client, mobile detection, etc.)

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Clerk](https://clerk.com) — authentication
- [Prisma](https://www.prisma.io) + [Neon](https://neon.tech) Postgres — database
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Resend](https://resend.com) — transactional email

## Real-time / polling

There is no WebSocket or SSE push anywhere in the codebase. The player's court-availability view (`/dashboard/browse`) uses React Query polling (`refetchInterval`, 15s) as a low-effort stand-in for live updates. `ws`/`@types/ws` are installed as dependencies but nothing imports or uses them yet — if real push is needed later, that's the open decision to make (WebSocket server vs. SSE vs. keeping/tuning polling).
