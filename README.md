# Play Padel

**Play Padel** is a padel-club booking platform: players browse clubs and courts and book available time slots, while club owners manage their courts, weekly availability, and reservations.

Two user roles, one app:

- **Players** — browse clubs, see real-time court availability, book and cancel their own reservations.
- **Owners** — manage their club's profile, courts, weekly availability templates, and every reservation made against their club.

See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for a full breakdown of what's implemented versus mocked/placeholder, and [`docs/roadmap.md`](docs/roadmap.md) for planned next steps.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Clerk](https://clerk.com) — authentication
- [Prisma](https://www.prisma.io) + [Neon](https://neon.tech) Postgres — database
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Resend](https://resend.com) — transactional email

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the required Clerk, database, and Resend credentials before running the app.

Open [http://localhost:3000](http://localhost:3000) to view it.

## Project structure

- `app/` — routes (App Router), split into public pages, `(auth)` pages, and the authenticated `dashboard/` area (player and owner views)
- `core/` — domain logic per business area (`clubs`, `courts`, `reservations`, `users`, `billing`, `notifications`, `audit`, `events`), each with its own `services`, `schemas`, `types`, and `consts`
- `components/ui/` — shadcn/ui primitives
- `prisma/schema.prisma` — database schema
- `lib/` — cross-cutting utilities (email, PDF generation, notification dispatch)
