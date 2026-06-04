# Strict RLS Rollout

Run this rollout after deploying the new public Edge Functions.

## 1. Deploy Edge Functions

Deploy these functions in Supabase:

```bash
supabase functions deploy public-store
supabase functions deploy public-register-customer
```

Set `PUBLIC_APP_ORIGIN` in Supabase Edge Function secrets:

```bash
supabase secrets set PUBLIC_APP_ORIGIN=https://loyalty-enox.vercel.app
```

Both functions are configured with `verify_jwt = false` because they serve public pages. They use the service role only inside the function and return limited fields.

## 2. Run Strict RLS SQL

Open Supabase SQL Editor and run:

```sql
-- paste the full file:
-- supabase/migrations/20260604170000_strict_owner_rls.sql
```

This removes anonymous read access from `stores` and anonymous insert access from `store_customers`.

## 3. Verify RLS

Anonymous users must not read stores directly:

```sql
set local role anon;
select * from public.stores;
reset role;
```

Expected result: zero rows or blocked access.

Authenticated store owners must see only their owned store:

```sql
select id, name, owner_user_id
from public.stores
where owner_user_id = auth.uid();
```

Use the Supabase API/DevTools test:

- `/store/:slug` loads through `public-store`.
- New customer registration uses `public-register-customer`.
- Browser network tab must not show direct `stores` or `store_customers` requests on public pages.

## 4. Auth Storage Check

In browser DevTools:

- `localStorage` must not contain Supabase `sb-*` auth tokens.
- `sessionStorage` must not contain `loyalty-enox-auth-session`.
- In the current Vite app, auth is non-persistent and held in memory only.

Full `HttpOnly` cookies still require the planned Next.js migration because JavaScript-only React cannot set or use `HttpOnly` cookies for Supabase PostgREST requests.
