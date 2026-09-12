# Admin Bootstrap

How to grant a user admin access. There are **two separate, unrelated admin mechanisms** in this app — don't confuse them.

| Mechanism                      | Gates                                                                                                                                                                     | Source of truth                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Clerk `publicMetadata.isAdmin` | The legacy `/admin/club-status` testing page and a few legacy `/api/admin/*` routes (`lib/auth/admin.ts`)                                                                 | Clerk, set via the CLI/dashboard |
| `UserProfile.isAdmin` (DB)     | The real, in-app admin dashboard experience — admin nav items, `/dashboard/admin-*` pages, all admin routes gated by `requireAdminProfile()` (`lib/auth/adminProfile.ts`) | This app's own Postgres database |

Granting one does **not** grant the other. For full admin access to the actual dashboard, both need to be set.

## 1. Clerk `publicMetadata.isAdmin`

Find the user's Clerk id:

```bash
clerk users list --email-address <email> --instance <dev|prod> --json
```

Copy the `id` (`user_...`) from the result, then set the metadata:

```bash
clerk api /users/<user_id>/metadata -X PATCH -d '{"public_metadata":{"isAdmin":true}}' --instance <dev|prod> --yes
```

On Windows Git Bash, prefix the second command with `MSYS_NO_PATHCONV=1` or the leading-slash path gets mangled:

```bash
MSYS_NO_PATHCONV=1 clerk api /users/<user_id>/metadata -X PATCH -d '{"public_metadata":{"isAdmin":true}}' --instance <dev|prod> --yes
```

**Before running this against `--instance prod`**: confirm the target user is genuinely who you mean to grant admin to. Don't assume "the only user in prod" is the right one — this app has real clubs signed up in production; check the email matches exactly.

## 2. `UserProfile.isAdmin` (DB)

Requires the user to have already signed in at least once (a `UserProfile` row must exist — it's created on first login/onboarding). Once it exists, run:

```bash
npm run manage
```

and pick **Grant admin access** from the menu — it asks for the target database and the user's email, and sets `UserProfile.isAdmin = true` directly. See `scripts/menu.ts` for the full list of maintenance actions available this way.

## Order of operations for a new admin

1. The person signs up / signs in to the app at least once (creates their `UserProfile` row, role defaults to `player`).
2. Set `UserProfile.isAdmin = true` for that row (step 2 above) — this is what unlocks the real admin dashboard.
3. Optionally also set the Clerk `publicMetadata.isAdmin` flag (step 1) if they also need the legacy `/admin/club-status` testing tool.

See also: `docs/ADMIN_IMPERSONATION.md` for the impersonation feature's own security model.
