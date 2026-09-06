# Admin Impersonation

Lets an app admin sign in **as** another user (a player or a club owner) for
support/debugging, using Clerk's real actor-token mechanism. This is
separate from `lib/auth/admin.ts` (the older Clerk-metadata-based
`/admin/club-status` testing tool) — impersonation is gated by the newer,
real `UserProfile.isAdmin` flag via `requireAdminProfile()`
(`lib/auth/adminProfile.ts`).

## What it does

1. An admin clicks an "impersonate" action for a target user.
2. The client calls `POST /api/admin/impersonate` with `{ userId }`.
3. The server creates a Clerk actor token
   (`clerkClient().actorTokens.create`) scoped to the target user, with the
   admin's own userId embedded as the `actor`.
4. The client receives a ready-to-use sign-in `url` and opens it in a
   **new browser tab** — the admin's own tab/session is left untouched.
   Opening that url signs the new tab in as the target user, with the
   actor payload embedded in that session's JWT.

## Where the buttons live

- **Players directory**
  (`app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`):
  an admin-only icon button per row (alongside the existing edit/delete
  actions) impersonates that player.
- **Club settings admin view**
  (`app/dashboard/settings/club/_components/AdminClubSettingsView/AdminClubSettingsView.tsx`):
  once a club is selected, an "Impersonate owner" button appears above the
  club settings form and impersonates that club's owner. The owner's
  userId is resolved via `GET /api/admin/clubs/[clubId]`, which now also
  returns `owner: { id, displayName } | null`
  (see `core/clubs/services/clubs.service.ts`'s `getClubOwner`).

## Security model

- **Gated at least as strictly as every other admin route** —
  `requireAdminProfile()`, no exceptions.
- **Guardrails on the target**:
  - An admin cannot impersonate themselves (400).
  - An admin cannot impersonate another admin (400) — impersonating another
    admin has no clear support use case and only adds risk.
  - 404 if the target userId has no `UserProfile` row.
- **Short-lived by design**: the actor token expires in 1 hour
  (`expiresInSeconds: 3600`), and any session created from it is capped at
  30 minutes (`sessionMaxDurationInSeconds: 1800`) — Clerk's documented
  defaults.
- **Mandatory audit log** on every successful impersonation — unlike some
  other audit calls in this codebase which are fire-and-forget
  best-effort, this one is never skipped on the success path. Logged via
  `logAudit()` with `action: "user.impersonated"`, the admin as the actor,
  the target `UserProfile` as the entity, and `metadata: { actorTokenId,
targetDisplayName }`.
- **The raw Clerk token is never persisted or logged anywhere** — only the
  ready-to-use sign-in `url` is returned to the client, and only the actor
  token's `id` (not the token itself) is written into audit metadata.

## Revoking a token

If an actor token was created in error (or a support session needs to be
cut short before it expires), call:

```
POST /api/admin/impersonate/revoke
{ "actorTokenId": "<id from the audit log's metadata>" }
```

This calls Clerk's `actorTokens.revoke(actorTokenId)` and invalidates the
pending token. It is gated by the same `requireAdminProfile()` check, but
does **not** write an audit log entry — revocation is the safe/cleanup
direction, and the original impersonation is already the audited event.

## Not intended for

This is a first-party support tool for a real admin the app owner
controls, built on Clerk's own documented actor-token feature. It must
never be extended toward unauthorized account takeover, and every use is
permanently recorded in the audit log.
