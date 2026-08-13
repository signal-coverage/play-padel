# Documentation Improvement Recommendations for Play Padel

## Overall Assessment

Your documentation is already very strong for an internal engineering
project. It clearly distinguishes between fully implemented features and
mocked functionality, making it easy for new contributors to understand
the current state.

The next step is not adding more technical details, but improving
organization, discoverability, and long-term maintainability.

---

# 1. High-Level Architecture

```text
Client (Next.js)
      │
      ▼
App Router
      │
      ▼
API Routes
      │
      ▼
core/
 ├── clubs
 ├── reservations
 ├── courts
 ├── users
 ├── billing
 ├── notifications
 └── audit
      │
      ▼
Prisma
      │
      ▼
Neon PostgreSQL

External Services
 ├── Clerk
 └── Resend
```

---

# 2. Production Readiness

Area Status

---

Authentication ✅ Ready
Booking ✅ Ready
Court Management ✅ Ready
Billing ⚠ Service exists, no API
Payments ❌ Manual only
Notifications ⚠ Partial
Audit Logs ⚠ Not wired
Landing Page ⚠ Placeholder content
Analytics ❌ Missing
Tests ❌ Missing

---

# 3. Booking Rules

- Prevent double booking of the same court.
- Server-side conflict validation.
- Players can cancel up to **2 hours** before the reservation.
- Court availability is generated from recurring schedules.
- Soft-deleted courts cannot receive new reservations.
- Reservation lifecycle:

```text
SCHEDULED
   ↓
CONFIRMED
   ↓
COMPLETED

or

CANCELLED

or

NO_SHOW
```

---

# 4. Multi-Tenancy

Each `Club` is an isolated tenant.

Owners can only access: - Their club - Their courts - Their reservations

Players can browse all active clubs.

`UserProfile` optionally belongs to a `Club`.

---

# 5. API Surface

```text
Authentication
POST /api/onboarding

Players
GET    /api/reservations/me
POST   /api/reservations
DELETE /api/reservations/:id

Courts
GET    /api/clubs/courts
POST   /api/clubs/courts
PATCH  /api/clubs/courts/:id

Reservations
GET    /api/clubs/reservations
PATCH  /api/clubs/reservations/:id
```

---

# 6. Environment Variables

- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- DATABASE_URL
- RESEND_API_KEY
- NEXT_PUBLIC_APP_URL

---

# 7. Development Setup

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Useful commands:

```bash
pnpm lint
pnpm test
pnpm prisma studio
```

---

# 8. Folder Structure

```text
app/
core/
components/
lib/
prisma/
public/
```

---

# 9. Known Limitations

- No tournaments
- No player rankings
- No payment gateway
- No reminder scheduler
- No audit logging
- Landing page uses placeholder content
- No player profiles
- No partner history

---

# 10. Roadmap

## Phase 1

- Stripe
- Mercado Pago
- Audit logging

## Phase 2

- Tournaments
- Rankings
- Match history

## Phase 3

- Mobile app
- Push notifications
- Player search

---

# 11. Security

Implemented: - Clerk authentication - Protected API routes - Server-side
authorization - Reservation conflict validation - Soft deletes for
courts

Missing: - Rate limiting - CSRF review - API throttling - CAPTCHA

---

# 12. Testing

Current: - Manual QA

Planned: - Vitest - Playwright - Integration tests

---

# 13. Performance

- Browse page polls every 15 seconds.
- Reservation conflict detection is always server-side.
- Availability is computed dynamically.

---

# 14. Feature Matrix

Feature UI API DB Ready

---

Browse Clubs ✅ ✅ ✅ ✅
Reservations ✅ ✅ ✅ ✅
Courts ✅ ✅ ✅ ✅
Billing ❌ ❌ ✅ ⚠
Notifications ⚠ ⚠ ✅ ⚠
Audit ❌ ❌ ✅ ❌
Events ❌ ❌ ❌ ❌
Player Profile ⚠ ❌ ❌ ❌

---

# 15. Database Diagram

```text
Club
 ├── Court
 │     ├── CourtAvailability
 │     └── Reservation
 │
 └── UserProfile (Owner)

UserProfile
 ├── Reservation
 ├── Invoice
 └── Payment
```

---

# Suggested Documentation Structure

1.  Product Overview
2.  Technical Architecture
3.  Implementation Status

This separation makes the documentation easier to navigate for
developers, product stakeholders, and new contributors.
