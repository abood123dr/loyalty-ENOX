# CSP Configuration

Current enforced CSP in `vercel.json`:

```http
default-src 'self';
script-src 'self';
connect-src 'self' https://*.supabase.co https://*.supabase.in https://walletobjects.googleapis.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none'
```

`style-src 'unsafe-inline'` is currently required because the React app uses inline style props in many screens and the chart component injects generated CSS. Removing it now can break production UI.

Production target after refactor:

```http
default-src 'none';
script-src 'self';
connect-src 'self' https://*.supabase.co https://*.supabase.in https://walletobjects.googleapis.com;
style-src 'self';
font-src 'self';
img-src 'self' data: blob:;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
report-uri /api/security/csp-report
```

To reach the production target:

1. Move inline React styles into CSS classes.
2. Self-host fonts instead of Google Fonts.
3. Restrict image hosts to known storage and wallet domains.
4. Add a CSP report endpoint once a server backend exists.
