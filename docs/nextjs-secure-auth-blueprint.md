# Next.js Secure Auth Blueprint

Use this file when migrating from Vite SPA auth to server-managed auth cookies.

## `middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';

const csp = [
  "default-src 'none'",
  "script-src 'self'",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://walletobjects.googleapis.com",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://loyalty-enox.vercel.app",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "report-uri /api/security/csp-report",
].join('; ');

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.protocol === 'http:') {
    return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}`, 308);
  }

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Auth Route Contract

`POST /api/auth/login`

- Validate CSRF token from `X-CSRF-Token`.
- Validate email/password shape.
- Call Supabase Auth server-side.
- Set cookies:
  - `access_token`: `HttpOnly; Secure; SameSite=Strict; Max-Age=1800`
  - `refresh_token`: `HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
  - `csrf_token`: `Secure; SameSite=Strict; Max-Age=1800`
- Return only safe user profile fields.

`POST /api/auth/logout`

- Validate CSRF token.
- Clear all auth cookies with `Max-Age=0`.
- Call Supabase sign out when possible.

`POST /api/auth/refresh`

- Read refresh token from `HttpOnly` cookie.
- Rotate Supabase session.
- Replace cookies.
- Never expose JWTs to the browser.

## Cookie Settings

```ts
const authCookie = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};
```

## CSRF

- Generate a random CSRF token server-side.
- Store a hashed copy in an `HttpOnly` cookie or server session.
- Send a readable CSRF token cookie to the client.
- Require `X-CSRF-Token` on every POST, PATCH, PUT, and DELETE.
- Reject if missing or mismatched.
