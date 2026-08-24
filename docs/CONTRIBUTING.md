# Contributing / Development Setup

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with real values before running the app — at minimum, a Clerk publishable/secret key pair and a `DATABASE_URL` pointing at a Postgres instance (Neon in production) are required for the app to start; `RESEND_API_KEY` is required for email sending (the app fails closed and logs a warning if it's unset, rather than crashing).

`CRON_SECRET` protects `/api/cron/*` (called by Vercel Cron, which has no Clerk session — see `vercel.json` and `docs/API.md`). Set it in the Vercel project's environment variables in production; locally it only matters if you're manually testing that route with a matching `Authorization: Bearer` header.

Prepayments now use per-club Mercado Pago OAuth connections (owners connect their own Mercado Pago account from Settings) rather than a single platform-wide token. `MERCADOPAGO_OAUTH_CLIENT_ID`/`MERCADOPAGO_OAUTH_CLIENT_SECRET` (from the Mercado Pago developer dashboard — the marketplace app's own OAuth credentials, not a seller token), `MP_TOKEN_ENCRYPTION_KEY` (32-byte AES-256-GCM key for encrypting stored club tokens at rest), and `MP_OAUTH_STATE_SECRET` (signs the OAuth `state` param) are required for club connect/callback to work (`lib/mercadopago/oauth.ts`, `app/api/clubs/mercadopago/connect`, `.../callback`). `MERCADOPAGO_ACCESS_TOKEN` is still required, but narrowly: it's the platform app's own token, used only to authenticate the OAuth token-exchange/refresh calls themselves (`lib/mercadopago/oauth.ts`) — it is no longer used for checkout preferences, payments, or refunds, which now use each club's own connected token via `getClubMercadoPagoClient(clubId)`. `MERCADOPAGO_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL` are still required for the prepayment flow (`lib/mercadopago/`, `/api/webhooks/mercadopago`). `NEXT_PUBLIC_APP_URL` must be a publicly reachable HTTPS URL in any environment Mercado Pago needs to call back to — locally, that means a tunnel like ngrok when testing webhooks. `CRON_SECRET` also protects `/api/cron/mercadopago-token-refresh` (daily proactive token refresh), in addition to `/api/cron/notifications`.

## Commands

```bash
npm run dev     # start the dev server (Turbopack)
npm run build   # production build (Turbopack)
npm run start   # run a production build
npm run lint    # ESLint
```

## Prisma

This project has no `prisma/migrations` history — schema changes are synced directly to the database:

```bash
npx prisma generate      # regenerate the client after any schema.prisma edit (no DB connection needed)
npx prisma db push       # sync schema.prisma to the actual database
npx prisma studio        # browse the database
```

Do **not** run `npx prisma migrate dev` — with no migration history, it will try to reset the entire database. The generated client outputs to `lib/generated/prisma` (gitignored).

## Conventions

Project-specific conventions (component structure, barrel export ordering, form layout inside drawers, etc.) live in [`AGENTS.md`](../AGENTS.md) at the repo root.
