# Admin Bootstrap

How to grant a user admin access. There are **two separate admin mechanisms** in this app — don't confuse them — but `npm run manage`'s Grant/Revoke admin actions now keep them in sync automatically, so you only need to run one command.

| Mechanism                      | Gates                                                                                                                                                                     | Source of truth                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `UserProfile.isAdmin` (DB)     | The real, in-app admin dashboard experience — admin nav items, `/dashboard/admin-*` pages, all admin routes gated by `requireAdminProfile()` (`lib/auth/adminProfile.ts`) | This app's own Postgres database |
| Clerk `publicMetadata.isAdmin` | The legacy `/admin/club-status` testing page and a few legacy `/api/admin/*` routes (`lib/auth/admin.ts`)                                                                 | Clerk, set via the CLI/dashboard |

## Granting/revoking admin access

Requires the user to have already signed in at least once (a `UserProfile` row must exist — it's created on first login/onboarding). Once it exists, run:

```bash
npm run manage
```

and pick **Grant admin access** (or **Revoke admin access**) from the menu — it asks for the target database and the user's email, sets `UserProfile.isAdmin` directly, and then also sets the matching Clerk `publicMetadata.isAdmin` value for that same user (best-effort: if the Clerk API call fails, the DB change — the one that actually unlocks the dashboard — has already happened and is not rolled back; the script logs a warning so you know to retry the Clerk side by hand). See `scripts/menu.ts` for the full list of maintenance actions available this way.

If you ever need to set ONLY the Clerk flag by hand (e.g. the sync step failed and you're retrying just that part), find the user's Clerk id and set it directly:

```bash
clerk users list --email-address <email> --instance <dev|prod> --json
clerk api /users/<user_id>/metadata -X PATCH -d '{"public_metadata":{"isAdmin":true}}' --instance <dev|prod> --yes
```

On Windows Git Bash, prefix the second command with `MSYS_NO_PATHCONV=1` or the leading-slash path gets mangled:

```bash
MSYS_NO_PATHCONV=1 clerk api /users/<user_id>/metadata -X PATCH -d '{"public_metadata":{"isAdmin":true}}' --instance <dev|prod> --yes
```

**Before running anything against `--instance prod` or a production database**: confirm the target user is genuinely who you mean to grant admin to. Don't assume "the only user in prod" is the right one — this app has real clubs signed up in production; check the email matches exactly.

## Checking for existing drift

Anyone granted admin before the sync above existed — or via the Clerk Dashboard/CLI directly, bypassing `npm run manage` entirely — can still have the two flags out of sync. Run `npm run manage` and pick **Reconcile admin flags** for a read-only report of every mismatch (which side has it, which doesn't); re-run Grant/Revoke for each name it lists to close the gap.

See also: `docs/ADMIN_IMPERSONATION.md` for the impersonation feature's own security model.
