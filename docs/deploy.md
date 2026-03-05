# Deployment Configuration

This project uses:
- TanStack Start frontend (Netlify or local runtime env)
- Convex backend env (Convex dashboard variables)
- Clerk for authentication

Upload CORS is explicit allowlist only. The upload endpoint trusts origins from:
- `APP_URL`
- `VITE_APP_URL`
- `CORS_ALLOWED_ORIGINS` (optional comma-separated extras)

In non-production Convex env (`NODE_ENV != "production"`), localhost origins are also accepted.

## Local Development

### Frontend env (`.env.local`)

Set:
- `CONVEX_DEPLOYMENT`
- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

`CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` are usually written by `npx convex dev`.

### Convex env (Convex Dashboard)

Set:
- `OPENAI_API_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `APP_URL=http://localhost:3006`
- Optional: `CORS_ALLOWED_ORIGINS=http://127.0.0.1:3006,http://localhost:5173`
- `NODE_ENV=development` (or omit; non-production default behavior is fine)

## Netlify + Convex Preview Environments

Use a paired preview frontend and preview Convex deployment.

### Netlify preview env

Set:
- `VITE_CONVEX_URL` to the preview Convex URL
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Convex preview env

Set:
- `OPENAI_API_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `NODE_ENV=production`
- `APP_URL=<preview frontend origin>`
- Optional: `CORS_ALLOWED_ORIGINS=<comma-separated additional preview origins>`

Important:
- Deploy Preview URLs can change per commit. With wildcard preview domains disabled, each trusted preview origin must be listed explicitly.
- Prefer stable branch deploy URLs when possible, then set `APP_URL` to that stable origin.

## Production Deploy

### Frontend (Netlify production)

Set:
- `VITE_CONVEX_URL` to production Convex URL
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Convex production env

Set:
- `OPENAI_API_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `NODE_ENV=production`
- `APP_URL=https://<your-production-domain>`
- Optional: `CORS_ALLOWED_ORIGINS=https://<additional-trusted-origin-1>,https://<additional-trusted-origin-2>`

## Quick Verification Checklist

1. `OPTIONS /upload` from your frontend origin returns `Access-Control-Allow-Origin` equal to that origin.
2. `OPTIONS /upload` from an untrusted origin does not reflect that origin.
3. Authenticated upload works from trusted origin.
4. Authenticated upload is blocked by browser CORS from untrusted origin.
