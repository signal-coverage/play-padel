<div align="center">

# Play Padel

**The platform padel clubs and players use to book, manage, and compete — without the back-and-forth.**

[![CI](https://github.com/signal-coverage/play-padel/actions/workflows/ci.yml/badge.svg)](https://github.com/signal-coverage/play-padel/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-Neon%20Postgres-2D3748?logo=prisma&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Mercado Pago](https://img.shields.io/badge/Payments-Mercado%20Pago-00B1EA?logo=mercadopago&logoColor=white)

[Documentation](docs/README.md) · [API reference](docs/API.md) · [Database schema](docs/DATABASE.md) · [Architecture](docs/ARCHITECTURE.md)

</div>

---

Real-time court availability, secure payments, and full doubles tournaments — one app for both sides of a padel club.

## What it does

<table>
<tr>
<td width="50%" valign="top">

### For players

- Browse clubs and courts with live, real-time availability
- Book and cancel reservations, with a self-cancel cutoff enforced server-side
- Tag a partner you played with — build a real history, not a guess
- Discover and register for club-run doubles tournaments, solo or as a pair
- Track your own tournament record, results, and skill profile from the dashboard

</td>
<td width="50%" valign="top">

### For club owners

- Manage courts, weekly availability templates, and closures
- Run every reservation made against your club from one dashboard
- Get paid — Mercado Pago Checkout Pro for prepayment, or bank transfer
- Run full doubles tournaments: group stage → knockout bracket, manual or auto-generated groups, live standings
- Audit trail, membership billing, and plan management, all built in

</td>
</tr>
</table>

## Tech stack

| Layer         | Technology                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework     | [Next.js](https://nextjs.org) (App Router) + TypeScript                                                     |
| Auth          | [Clerk](https://clerk.com)                                                                                  |
| Database      | [Prisma](https://www.prisma.io) + [Neon](https://neon.tech) Postgres                                        |
| UI            | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)                                                           |
| Payments      | [Mercado Pago](https://www.mercadopago.com) — Checkout Pro                                                  |
| Email         | [Resend](https://resend.com) — transactional email                                                          |
| Observability | [Vercel Analytics](https://vercel.com/analytics) + [Speed Insights](https://vercel.com/docs/speed-insights) |

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the required Clerk, database, and Resend credentials before running the app.

Open [http://localhost:3000](http://localhost:3000) to view it.

## Project structure

| Path                   | Purpose                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`                 | Routes (App Router) — public pages, `(auth)` pages, and the authenticated `dashboard/` area (player and owner views)                                                                             |
| `core/`                | Domain logic per business area (`clubs`, `courts`, `reservations`, `tournaments`, `users`, `billing`, `notifications`, `audit`) — each with its own `services`, `schemas`, `types`, and `consts` |
| `components/ui/`       | shadcn/ui primitives                                                                                                                                                                             |
| `prisma/schema.prisma` | Database schema                                                                                                                                                                                  |
| `lib/`                 | Cross-cutting utilities — `mercadopago/` (Checkout Pro client, preferences, refunds, webhook signature verification), `email/` (Resend client), `notifications/` (dispatch), `utils/`            |

## Learn more

See [`docs/README.md`](docs/README.md) for the full documentation index — feature status, architecture, API reference, database schema, roadmap, setup, and security.
