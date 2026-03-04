# Clerk Integration Plan (TanStack Start + Convex + Netlify)

Date: 2026-03-04

This doc is an implementation plan for adding Clerk auth. Dependency upgrades and related migrations may already exist in the repo; Clerk auth has not been implemented yet.

## Requirements (Locked)

- App: TanStack Start + TanStack Router + Vite (see `src/router.tsx`, `src/routes/__root.tsx`)
- Data: Convex
- Hosting: Netlify (Preview deploys + Production)
- Auth: Clerk (net-new)
- Login method: email magic link only
- Everything requires auth (default-deny), except auth pages
- No collaboration; single role
- UI: start with Clerk prebuilt UI; match existing layout/styling (shadcn)
- Data model: Clerk-only (no `users` table in Convex)
- Authorization: users can only read/write their own data
- Deletions: support hard delete (see “Account Deletion” section)
- Tests: add authorization cases (unauthenticated blocked, cross-user denied)

## Current Repo Facts (Observed Locally)

- TanStack Start is configured via Vite plugin `tanstackStart()` in `vite.config.ts`.
- TanStack package versions were upgraded (see `package.json`):
  - `@tanstack/react-start`: `^1.166.1`
  - `@tanstack/react-router`: `^1.163.3`
  - `@tanstack/react-query`: `^5.90.21`
- Router global wrapper exists in `src/router.tsx` and currently wraps:
  - `QueryClientProvider` (React Query)
  - `ConvexProvider` (Convex client for `@convex-dev/react-query`)
- The repo no longer uses `@tanstack/react-router-with-query` (it has been removed); React Query is wired up explicitly via `QueryClientProvider`.
- Convex schema in `convex/schema.ts` has tables that are currently global (no per-user ownership fields):
  - `recipes`, `threads`, `messages`
  - `unauthenticatedUploads`, `visionAnalysis`
- Upload flow uses a Convex HTTP action at `/upload` (Convex `.site` domain) and is currently unauthenticated:
  - Frontend calls in `src/routes/upload.tsx` and `src/components/AddRecipeModal.tsx`
  - HTTP handler in `convex/uploads/actions.ts`

## Key Constraints / Risks

- Installing Clerk SDK packages requires network access. In sandboxed/dev environments, dependency installation may be blocked without explicit network permission/approval.
- TanStack Router route manifest is committed (`src/routeTree.gen.ts`). Adding auth routes requires regenerating or updating this generated file.

## Dependencies To Add

Primary (per Clerk + TanStack Start docs):
- `@clerk/tanstack-react-start`

Note on Convex docs vs Clerk package naming:
- The Convex TanStack Start + Clerk doc currently shows imports from `@clerk/tanstack-start` and `@clerk/tanstack-start/server`.
- Clerk has renamed the package to `@clerk/tanstack-react-start` (and server helpers to `@clerk/tanstack-react-start/server`).
- When implementing, follow the Clerk package naming and translate the Convex doc imports accordingly.

Convex integration already exists via `convex` and `convex/react-clerk` (shipped within `convex` package).

## Environment Variables

Frontend (Vite):
- `VITE_CLERK_PUBLISHABLE_KEY`
- (Optional) `VITE_APP_URL` or similar, if needed for redirects; prefer Clerk SDK defaults when possible.

Server:
- `CLERK_SECRET_KEY`

Convex/Clerk JWT auth:
- Add `CLERK_JWT_ISSUER_DOMAIN` (the Clerk "Issuer"/"Frontend API URL", e.g. `https://<app>.clerk.accounts.dev`).
- Configure a Clerk JWT template named `convex`:
  - This name must be `convex` because the client requests `getToken({ template: "convex" })`.
  - Ensure the template produces tokens with audience `convex` (Convex checks `applicationID: "convex"` in `convex/auth.config.ts`).

Where these env vars live:
- Local dev: put `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_JWT_ISSUER_DOMAIN` in `.env.local`.
- Netlify: set the same three vars for both Production and Preview deploy contexts.
- Convex: set `CLERK_JWT_ISSUER_DOMAIN` for each deployment (dev/prod) so Convex can validate Clerk JWTs.

`.env.example` changes (add these placeholders):
```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex auth (Clerk JWT issuer / frontend API URL)
CLERK_JWT_ISSUER_DOMAIN=
```

Netlify:
- Set the above env vars for:
  - Production
  - Preview deploy contexts
- Clerk Dashboard must allow:
  - All relevant Netlify Preview origins (e.g. `https://*.netlify.app`)
  - Production domain
  - Local dev (`http://localhost:3006`)

## Implementation Strategy (High Level)

1. **Convex + Clerk auth plumbing (TanStack Start SSR + client)**
   - Update the router context to include `convexQueryClient` (in addition to `queryClient`).
     - Optional: also expose `convexClient` as `convexQueryClient.convexClient` for convenience in provider wrappers.
   - In the root route:
     - Add a `beforeLoad` that fetches the Clerk token server-side and sets it on `convexQueryClient.serverHttpClient` so TanStack Start loaders can make authenticated SSR requests.
     - Wrap the app with:
       - `ClerkProvider`
       - `ConvexProviderWithClerk` (from `convex/react-clerk`) using Clerk `useAuth` to keep tokens fresh on the client.
   - Ensure direct `fetch` calls to Convex HTTP actions include `Authorization: Bearer <Clerk JWT (template=convex)>`.

2. **Front-end auth UI + routing (default-deny)**
   - Add `/sign-in/*` and `/sign-up/*` routes using Clerk prebuilt components.
   - Gate the rest of the app at the root route level (default-deny):
     - Prefer doing the redirect in `beforeLoad` when possible (covers SSR + loaders).
     - Allow auth routes through when signed out.

3. **Per-user data model & query/mutation enforcement**
   - Add `userId: string` to all user-owned tables.
   - Add indexes that start with `userId` so queries do not scan cross-user.
   - Update all queries/mutations to:
     - Require authentication
     - Enforce ownership on read/write

4. **Tests**
   - Use `convex-test`’s `t.withIdentity({ subject: "user_123" })` to simulate different users.
   - Add tests for:
     - Unauthenticated calls throw
     - Cross-user access denied

5. **Account deletion**
   - Implement a Convex mutation to hard-delete all documents owned by the current user and delete associated storage objects.
   - Provide UI entrypoint (e.g., “Delete my data” / “Delete account”) and clarify behavior.
   - Add a follow-up for webhook-based deletion to cover cases where users delete via Clerk UI directly.

## Update `AGENTS.md` (Post-Auth Guidance)

After Clerk is integrated, update `AGENTS.md` with guidance so future work doesn’t accidentally bypass authorization.

Backend (Convex) guidance to add:
- Every user-owned table must have `userId: string` and at least one index that starts with `userId`.
- All public queries/mutations must:
  - require authentication (`ctx.auth.getUserIdentity()` non-null)
  - enforce ownership on reads and writes (`doc.userId === authedUserId`)
- Internal queries/actions that enumerate data (list/search) must accept `userId` explicitly and use `by_userId_*` indexes. Do not `collect()` across the full table.
- For “child” records (e.g., messages belong to threads), authorize via the parent record ownership (thread.userId) before reading/writing children.
- Add/maintain tests whenever a function changes:
  - unauthenticated access is rejected
  - cross-user access is rejected
  - user-scoped queries never return other users’ docs

Frontend (TanStack Start) guidance to add:
- Default-deny routing: new routes should be considered authenticated unless explicitly marked as public (sign-in/sign-up).
- Avoid firing Convex queries before auth is loaded (render a loading shell while Clerk initializes).
- Any direct HTTP `fetch` to Convex HTTP actions must include `Authorization: Bearer <Clerk token template=convex>`.
- UI should handle “not authorized” and “not signed in” states explicitly (redirect vs show 403) and never rely on client-side filtering to hide other users’ data.

## File Manifest (Expected Changes)

### New files
- `src/start.ts`
  - Create TanStack Start server integration with `clerkMiddleware` per Clerk docs.
- `src/routes/sign-in.$.tsx`
  - Clerk `<SignIn />` route (splat to support Clerk internal path routing).
- `src/routes/sign-up.$.tsx`
  - Clerk `<SignUp />` route (splat).
- `convex/auth.ts` (or `convex/lib/auth.ts`)
  - `requireClerkUserId(ctx)` helper that reads `ctx.auth.getUserIdentity()` and returns `identity.subject`.
- `docs/auth/clerk-followups.md` (optional; can be a section in this doc instead)
  - Webhooks, orgs/collab, audit, etc.

### Modify files
- `package.json`, `package-lock.json`
  - Add `@clerk/tanstack-react-start`.
- `src/router.tsx`
  - Add `convexQueryClient` (and optionally `convexClient`) to router context.
- `src/routes/__root.tsx`
  - Add SSR auth in `beforeLoad` (set `serverHttpClient` auth) + global auth gate + provider wrappers.
- `src/routeTree.gen.ts`
  - Regenerate to include new auth routes. (Prefer generator; if not possible, update manually but expect overwrite.)
- `src/routes/upload.tsx`
  - Include Clerk token in `fetch` to Convex `/upload`.
- `src/components/AddRecipeModal.tsx`
  - Same as above.
- `convex/schema.ts`
  - Add `userId` fields + new indexes (see below).
- `convex/recipes.ts`, `convex/threads.ts`, `convex/messages.ts`
  - Require auth + enforce ownership.
- `convex/uploads/actions.ts`, `convex/uploads/mutations.ts`, `convex/uploads/queries.ts`
  - Require auth in HTTP action and scope uploads by user.
- `convex/vision/mutations.ts`, `convex/vision/queries.ts`, `convex/recipePipeline.ts`
  - Ensure analysis and recipe creation are scoped to the correct user.
- `convex/uploads.test.ts` (and any other Convex tests that touch auth’d functions)
  - Add `withIdentity` and new authorization tests.

## Convex Schema Changes (Detailed)

### `recipes`
- Add `userId: v.string()`
- Add indexes (avoid scans):
  - `by_userId_createdAt`: `["userId", "createdAt"]`
  - `by_userId_mealType_createdAt`: `["userId", "mealType", "createdAt"]`
  - `by_userId_isFavorite_createdAt`: `["userId", "isFavorite", "createdAt"]`

### `threads`
- Add `userId: v.string()`
- Replace/augment index:
  - `by_userId_updatedAt`: `["userId", "updatedAt"]`

### `messages`
- Keep `threadId` index; enforce ownership via thread lookup.
- Optional optimization:
  - `threads` lookup should be a single `db.get` (no scan).

### `unauthenticatedUploads` (rename optional)
Option A (minimal change): keep table name, but make it authenticated.
- Add `userId: v.string()`
- Add index `by_userId_uploadDate`: `["userId", "uploadDate"]`
- Keep existing `by_storageId`

Option B (cleaner): rename to `uploads` (requires schema + code changes everywhere).
- Since there are no existing users, this is feasible, but it is more diff.

### `visionAnalysis`
- Add `userId: v.string()` (duplicated from upload at creation time for efficient filtering).
- Add indexes:
  - `by_userId_status`: `["userId", "status"]`
  - `by_userId_uploadId`: `["userId", "uploadId"]`
- Keep `by_status` if still useful for ops, but avoid exposing cross-user access.

## Convex Function Changes (Detailed)

### Auth helper
Implement in `convex/auth.ts`:
- `requireClerkUserId(ctx)`:
  - `const identity = await ctx.auth.getUserIdentity()`
  - if null, throw `new Error("Not authenticated")`
  - return `identity.subject` (Clerk user id)

### Recipes (`convex/recipes.ts`)
- All public queries/mutations require auth and scope by `userId`.
- Replace full scans:
  - `list` must not do `collect()` over all recipes.
  - Use the best index based on filters:
    - if `mealType`, prefer `by_userId_mealType_createdAt`
    - else if `favoritesOnly`, prefer `by_userId_isFavorite_createdAt`
    - else `by_userId_createdAt`
  - Apply remaining filter via `.filter(...)` only after narrowing by `userId` index.
- `get/update/toggleFavorite/remove`:
  - `db.get` then verify `doc.userId === userId` before returning/patching/deleting.
- Internal queries used by chat tools must also be scoped (important to prevent cross-user leaks):
  - Change signatures to include `userId`:
    - `searchInternal({ userId, query })`
    - `listInternal({ userId, mealType?, limit? })`
    - `getInternal({ userId, id })` (if the tool remains)
  - Each internal query must use a `by_userId_*` index to narrow results (no table scans via `collect()`).
  - `convex/chat.ts` (`internalAction respond`) must derive the scope by loading the owning thread first (via an internal thread getter) and passing `thread.userId` into all recipe internal queries.

### Threads (`convex/threads.ts`)
- `create`: require auth; set `userId`.
- `list`: require auth; query `by_userId_updatedAt`.
- `get`: require auth; verify ownership.
- Add internal query `getInternal({ threadId })` (no auth) for internal actions to fetch the thread and obtain `userId` for scoping (do not rely on the action having auth context).

### Messages (`convex/messages.ts`)
- `list/send`: require auth; `db.get(threadId)` and verify thread ownership (`thread.userId === authedUserId`).
  - This is the public guard that prevents users from scheduling `internal.chat.respond` on someone else's thread.
- Internal functions can remain internal but must not leak cross-user data:
  - internal list by thread is OK if threadId is only obtained via owned thread paths.

### Upload HTTP action (`convex/uploads/actions.ts`)
- Require `Authorization: Bearer <token>`:
  - `ctx.auth.getUserIdentity()` must be non-null; otherwise 401.
- Tighten CORS:
  - Allow `http://localhost:*` for dev
  - Allow `https://*.netlify.app` for preview
  - Optionally allow configured production origin via env
- Pass through and store metadata via authenticated mutation (mutation reads auth itself).

### Upload queries/mutations (`convex/uploads/*`)
- `saveFileMetadata`, `deleteUpload`, `listUploads`, `getUpload`, `getUploadByStorageId`:
  - require auth
  - enforce ownership (upload.userId === userId)
  - `listUploads` should use `by_userId_uploadDate` or `by_userId_*` index

### Vision (`convex/vision/*`)
- `triggerAnalysis` must:
  - require auth
  - ensure the upload belongs to the current user
  - create `visionAnalysis` with `userId`
- All public queries must:
  - require auth
  - filter by `userId` (use indexes; avoid scanning all analyses)
- `getPendingRecipes` currently does a multi-step scan; replace with indexed queries by `(userId, status)` for:
  - pending
  - processing
  - completed without recipe (index + filter by missing `recipeId`)

### Recipe pipeline (`convex/recipePipeline.ts`)
- Ensure newly created recipes store `userId` from the analysis.
- Any internal “list recipes” used for placeholders should also be scoped.

## Frontend Changes (Detailed)

### Router context (`src/router.tsx`)
Update the router creation to match the Convex “TanStack Start with Clerk” guidance:
- Create:
  - `convexQueryClient` (a `ConvexQueryClient`)
- Put it into router context so root `beforeLoad` can set auth for SSR loaders:
  - `context: { queryClient, convexQueryClient }`
  - Note: `convexQueryClient.convexClient` is the underlying `ConvexReactClient` instance; expose it via context too if the Clerk provider wrapper needs it.
- Keep `Wrap` using:
  - `<QueryClientProvider client={queryClient}>` (required since `@tanstack/react-router-with-query` has been removed)
  - `<ConvexProvider client={convexQueryClient.convexClient}>` (required for `@convex-dev/react-query` integration).

### Root route SSR auth + providers + default-deny (`src/routes/__root.tsx`)
Match the Convex doc’s pattern so SSR loaders are authenticated:
- Add a `createServerFn` handler that:
  - calls `getAuth(getWebRequest())`
  - calls `auth.getToken({ template: "convex" })`
  - returns `{ userId, token }`
- In `beforeLoad`:
  - call the server fn
  - if `token` exists, set `ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)` (SSR-only)
  - enforce default-deny:
    - if `!userId` and route is not `/sign-in` or `/sign-up`, redirect to `/sign-in`
- In the root component:
  - wrap with `<ClerkProvider>` (package: `@clerk/tanstack-react-start`)
  - wrap with `<ConvexProviderWithClerk client={context.convexClient ?? context.convexQueryClient.convexClient} useAuth={useAuth}>` so client tokens refresh
  - render the app layout + `<Outlet />` inside those providers

Important: the Convex doc shows imports from `@clerk/tanstack-start` and `@clerk/tanstack-start/server`. When implementing, use the renamed packages:
- `@clerk/tanstack-react-start`
- `@clerk/tanstack-react-start/server`

### Auth routes
- Add:
  - `src/routes/sign-in.$.tsx`
  - `src/routes/sign-up.$.tsx`
- Center content in existing layout and use shadcn components for the outer container.

### Upload fetch calls
- In `src/routes/upload.tsx` and `src/components/AddRecipeModal.tsx`:
  - Use `useAuth().getToken({ template: "convex" })`
  - Add header: `Authorization: Bearer ${token}`
  - Error if token is null (should be unreachable if route gated correctly).

### Optional: User menu
- Add Clerk `UserButton` somewhere persistent (e.g. chat sidebar footer).
- Keep styling minimal; avoid disrupting existing layout.

## Tests (Convex)

Update/extend `convex/uploads.test.ts`:
- Use `const t = convexTest(schema, modules).withIdentity({ subject: "user_a" })` for authenticated tests.
- Add tests:
  - unauthenticated call to `saveFileMetadata` throws “Not authenticated”
  - user_a cannot `getUpload` created by user_b
  - `listUploads` returns only uploads for current user

Add analogous authorization tests for:
- `convex/recipes.ts`
  - user scoping for list/get/update/delete
- `convex/threads.ts` and `convex/messages.ts`
  - sending/listing messages across users is denied

### TDD: Internal Scoping (Recommended)

Write these tests before changing implementation, then implement until green:

- `recipes.searchInternal` is user-scoped:
  - seed recipes for `userA` and `userB` with overlapping keywords
  - assert `searchInternal({ userId: userA, query: "pasta" })` never returns `userB` recipes
- `recipes.listInternal` is user-scoped:
  - seed multiple recipes per user
  - assert `listInternal({ userId: userA })` only returns `userA` recipes
  - (optional) assert ordering/limit behavior still holds within-user
- `recipes.getInternal` is user-scoped:
  - seed a `userB` recipe id
  - assert `getInternal({ userId: userA, id: userBRecipeId })` returns `null` (or throws; pick and standardize)
- `messages.send` blocks cross-user thread IDs (prevents scheduling `internal.chat.respond` on foreign threads):
  - create thread as `userA`
  - attempt `messages.send` as `userB` targeting `userA` thread
  - assert it throws “Not authorized” (or equivalent)

Test harness notes:
- Prefer `convex-test` identities: `t.withIdentity({ subject: "userA" })`.
- Avoid full scans in test setup too: insert directly via `ctx.db.insert` inside `t.run(...)` when easier.

## Account Deletion (Hard Delete)

Implement a Convex mutation (name suggestion: `users.deleteMyData` or `account.deleteMyData`) that:
- Requires auth (current userId).
- Deletes:
  - all `recipes` with `userId`
  - all `threads` with `userId`
  - all `messages` for those threads
  - all uploads for user:
    - delete Convex storage objects
    - delete upload metadata
  - all `visionAnalysis` with `userId`

Add a UI entrypoint (minimal):
- A route or modal triggered from user menu that:
  - confirms destructive action
  - calls mutation
  - then signs out
  - optionally navigates to `/sign-in`

Important caveat:
- If the user deletes their Clerk account from Clerk’s hosted UI without going through this mutation, Convex data will remain unless we add Clerk webhooks.

## Follow-ups (Create Later)

- Add Clerk webhooks for:
  - `user.deleted` -> hard delete Convex data server-side
  - optionally `user.updated` if storing cached user profile fields (not in this plan)
- Evaluate adding “organization” support if collaboration is added later.
- Tighten CORS further:
  - configurable allowlist per environment (Netlify preview/prod/local)
- Add a “403/Not authorized” UX for cross-user route IDs if users paste URLs.
- Upload hardening: the initial plan adds auth + CORS to the upload HTTP action, but does not add all abuse/malware controls (size limits, MIME+content validation, extension allowlists, per-user quotas/rate limits, or a safe serving policy). Without these controls, authenticated users can abuse storage/compute and increase downstream risk from malicious files.
- CORS origin semantics: the plan permits broad origin patterns (e.g. `http://localhost:*`, `https://*.netlify.app`) but does not define exact origin parsing/canonicalization/matching semantics. Naive wildcard matching is error-prone and can admit unintended origins. Define strict parse-and-compare allowlist behavior per environment.

## Step Breakdown (Cap ~4 files per step)

1. Dependency + env scaffolding
   - `package.json`, `package-lock.json`
   - `.env.example`: add `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
   - (Netlify config docs, if any)

2. Clerk + Convex providers
   - `src/router.tsx`
   - `src/routes/__root.tsx`

3. Auth routes + route tree regeneration
   - `src/routes/sign-in.$.tsx`
   - `src/routes/sign-up.$.tsx`
   - regenerate/update `src/routeTree.gen.ts`

4. Convex schema ownership fields + indexes
   - `convex/schema.ts`

5. Convex auth helper + core tables enforcement
   - `convex/auth.ts`
   - `convex/recipes.ts`
   - `convex/threads.ts`
   - `convex/messages.ts`

6. Upload auth + scoping
   - `convex/uploads/actions.ts`
   - `convex/uploads/mutations.ts`
   - `convex/uploads/queries.ts`
   - `src/routes/upload.tsx`
   - `src/components/AddRecipeModal.tsx`

7. Vision + pipeline scoping
   - `convex/vision/mutations.ts`
   - `convex/vision/queries.ts`
   - `convex/recipePipeline.ts`
   - `convex/chat.ts` (pass userId to internal recipe queries)

8. Tests
   - `convex/uploads.test.ts`
   - add new test files or extend existing for recipes/threads/messages

9. Account deletion
   - new Convex mutation file
   - small UI entrypoint
   - tests
