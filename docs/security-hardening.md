# Loyalty ENOX Security Hardening

This project is currently a Vite React SPA on Vercel with Supabase as the API. The codebase does not run on Next.js yet, so browser-only code cannot set `HttpOnly` cookies. The current implementation removes Supabase JWT persistence from `localStorage` by using in-memory session storage. Full `HttpOnly`, `Secure`, `SameSite=Strict` auth requires a server boundary such as Next.js route handlers, a BFF, or Supabase SSR.

## Implemented Now

- Vercel HTTP security headers in `vercel.json`.
- HSTS with preload settings.
- CSP enforcement compatible with the current app.
- Legacy Supabase token cleanup from `localStorage`.
- Supabase auth session stored in memory, not persistent browser storage.
- Super Admin verification through the deployed `verify-admin` Edge Function.
- RLS hardening migration in `supabase/migrations/20260604153000_enterprise_rls_hardening.sql`.

## Current Security Headers

Configured in `vercel.json`:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-Permitted-Cross-Domain-Policies: none`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

The current `Permissions-Policy` keeps `camera` and `geolocation` available for this origin because QR scanning and map-based notifications need them. If security policy must disable those features entirely, change it to:

```http
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Authentication Status

The Supabase client now uses memory storage:

- Tokens are not written to `localStorage`.
- Existing `sb-*` and Supabase keys in `localStorage` are removed on startup and logout.
- Auto-refresh works while the tab session is alive.
- A full page refresh requires logging in again because there is no persistent client-side token. This is intentional until the app moves auth behind a server.

## Required Next Step For HttpOnly Cookies

Move auth exchange to a server boundary:

1. Add Next.js App Router or a backend-for-frontend.
2. POST email/password to a server route.
3. Server calls Supabase Auth.
4. Server stores access and refresh token in `HttpOnly; Secure; SameSite=Strict` cookies.
5. Server refreshes tokens before expiry.
6. Frontend never sees JWT values.

## RLS Model

The new RLS migration enforces:

- Store owners can access only their stores.
- Store customers are scoped by `store_id`.
- Stamp scans must belong to the same store and customer.
- Notifications are scoped by store.
- Profiles are self-read/write, with super-admin read access.
- Optional `customers`, `transactions`, and `rewards` tables are hardened if they exist.

Run in Supabase SQL Editor:

```sql
-- paste and run:
-- supabase/migrations/20260604153000_enterprise_rls_hardening.sql
```

## API Security

Current Supabase Edge Functions should follow this pattern:

- Validate body shape before using values.
- Reject missing `storeId`, `customerId`, `title`, and `message`.
- Never return private keys, JWTs, or raw service errors to users.
- Keep `SERVICE_ROLE_KEY` only in Supabase Edge Function secrets.
- Use per-origin CORS, not wildcard CORS, for credentialed endpoints.

## SRI

The Vite production build emits hashed same-origin assets, which is the preferred model for local JS/CSS. SRI is mainly needed for third-party CDN scripts/styles. This app does not load Supabase JS from a CDN. Google Fonts are currently imported from CSS, which cannot be reliably protected with SRI. For production-grade hardening, self-host the font files and remove the Google Fonts network dependency.

## Testing Checklist

Run locally:

```bash
npm run lint
npm run build
npm audit
```

Verify deployed headers:

```powershell
Invoke-WebRequest https://loyalty-enox.vercel.app -UseBasicParsing |
  Select-Object -ExpandProperty Headers
```

Browser DevTools checks:

- Application > Local Storage: no `sb-*` Supabase auth token remains after login.
- Network > main document: HSTS, CSP, frame, referrer, and content-type headers exist.
- Console: no CSP violations that break app workflows.
- Supabase SQL Editor: RLS enabled on tenant tables.
- Test with two store-owner users: each user sees only their store data.

## Rollback

If auth sessions become too strict for operations:

1. Revert `src/api/base44Client.js` to default Supabase browser storage.
2. Rebuild and redeploy.
3. Keep RLS and headers unless they are the source of the issue.

If RLS blocks legitimate access:

1. Temporarily review policies in Supabase Table Editor > Authentication > Policies.
2. Do not disable RLS globally.
3. Add the missing owner relation or profile role, then retest.
