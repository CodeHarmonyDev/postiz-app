# Frontend V2 Migration Plan

## Purpose

This document is the execution brief for migrating the main web frontend away from Next.js App Router to a fresh Vite + TanStack Router application.

The recommendation is to build a new app in `apps/frontendV2` and treat it as a clean-room frontend, not an in-place refactor of `apps/frontend`.

This is documentation only. It is intentionally written for a follow-up agent or engineer to implement.

## Executive Recommendation

Build `apps/frontendV2` as a fresh React SPA with:

- Vite
- React 19
- TanStack Router
- Clerk React SDK
- Convex React client with Clerk auth bridging
- TanStack Query for non-Convex server state
- Vitest + Testing Library for unit/component tests
- Playwright for end-to-end tests
- Cloudflare deployment for the frontend shell

Do not try to "de-Next" the current `apps/frontend` incrementally. The current app is already a hybrid of:

- Next App Router
- legacy cookie/JWT auth
- partial Clerk adoption
- partial Convex adoption
- REST + SWR data loading
- Next-only middleware/layout/runtime features

That mix is exactly the kind of surface area that makes in-place migration slow, fragile, and difficult to reason about.

## Current State Snapshot

Based on the current repo:

- Main web app lives in `apps/frontend`.
- There are 22 page entries and 32 page/layout/route files under `apps/frontend/src/app`.
- There are 65 Next-specific import sites in `apps/frontend/src`.
- There are 315 frontend sites using legacy REST fetch/SWR patterns.
- There are 28 Convex-related integration sites.
- There is no frontend-specific Vitest, Playwright, Cypress, or Jest test harness in the current app.

Important current characteristics:

- Auth is in transition from custom cookie auth to Clerk.
- Data is in transition from Nest REST + Prisma toward Convex.
- The main layout depends on `next/font`, `next/script`, `next/headers`, App Router layouts, and Next middleware/proxy behavior.
- A local upload file-serving route exists in Next at `apps/frontend/src/app/(app)/api/uploads/[[...path]]/route.ts`.
- There is a separate extension/modal surface under `apps/frontend/src/app/(extension)`.

## Why A Fresh `apps/frontendV2` Is The Right Call

### Reasons

- It prevents Next-only concerns from leaking into the new architecture.
- It lets us define clean boundaries between Clerk, Convex, and legacy Nest endpoints.
- It avoids dragging over legacy auth cookies such as `auth`, `showorg`, and `impersonate`.
- It gives us a clean testing story from day one.
- It allows staged domain migration without destabilizing the live frontend.
- It supports Cloudflare deployment much more naturally than the current Next runtime assumptions.

### What not to do

- Do not mutate `apps/frontend` into Vite over time.
- Do not copy the entire `apps/frontend/src/components` tree into V2.
- Do not preserve the current middleware-driven auth model.
- Do not keep SWR as the long-term data layer in V2.
- Do not port Next route handlers into the Vite app unless they are explicitly redesigned for Cloudflare or moved behind the backend.

## Target Stack

### Core

- Build tool: Vite
- App type: client-rendered SPA
- Framework: React 19
- Routing: TanStack Router
- Language: TypeScript

### Auth and Data

- Authentication: Clerk via `@clerk/clerk-react`
- App data: Convex for domains already migrated or actively migrating
- Legacy backend access: typed API client modules against the existing Nest backend
- Async server state:
  - Convex hooks for Convex-backed domains
  - TanStack Query for legacy REST-backed domains

### UI and Styling

- Reuse existing browser-safe shared primitives from `libraries/react-shared-libraries` where they are framework-agnostic.
- Continue with Tailwind/CSS/SCSS where useful, but do not carry over layout assumptions tied to Next.
- Do not introduce a new heavyweight UI framework during the migration.

### Testing

- Unit/component: Vitest, `@testing-library/react`, `@testing-library/user-event`, `jsdom`
- API mocking for tests: MSW
- E2E: Playwright

### Observability

- Sentry browser SDK
- PostHog client integration
- Plausible or existing analytics wiring only if still required by product

### Deployment

- Frontend shell target: Cloudflare Pages or Cloudflare Workers static assets deployment
- Backend remains existing Nest + Convex estate
- Any server-only proxy logic must live in backend services or dedicated Cloudflare worker endpoints, not inside the Vite SPA

## Recommended App Shape

Recommended location:

- `apps/frontendV2`

Recommended structure:

```text
apps/frontendV2/
  src/
    app/
      router.tsx
      routeTree.gen.ts
      providers/
      layouts/
    routes/
      __root.tsx
      auth/
      app/
      preview/
      oauth/
    features/
      auth/
      analytics/
      launches/
      media/
      settings/
      billing/
      agents/
      integrations/
    lib/
      clerk/
      convex/
      api/
      query/
      env/
      sentry/
      analytics/
      i18n/
    components/
    styles/
    test/
  public/
```

## Boundary Rules For The New App

### Allowed reuse

- Browser-safe helpers from `libraries/react-shared-libraries`
- Translation config and locale assets
- DTO types only when they are stable and not Prisma-coupled
- Small leaf UI components that are purely presentational

### Reuse with caution

- Helpers in `libraries/helpers` that assume current auth cookies or redirect semantics
- Any code that reaches into `window.vars`
- Any code that assumes Next navigation APIs

### Do not reuse directly

- `@gitroom/frontend/*` imports from the current app as a default strategy
- Next layouts, route handlers, and middleware logic
- The current `LayoutContext` fetch wrapper as-is
- Any flow that depends on `next/navigation`, `next/headers`, `next/server`, `next/link`, or `next/font`

## Architecture Decisions

### 1. Use SPA-first routing, not SSR-first routing

This repo does not appear to rely heavily on real server rendering for the authenticated product. Most page files are thin wrappers over client components. That makes a Vite SPA the right default.

Implication:

- TanStack Router route loaders can handle preloading and redirects.
- Clerk protects routes on the client.
- Convex handles authenticated data after session establishment.
- Legacy Nest APIs remain behind typed client modules.

Tradeoff:

- Dynamic SEO/meta behavior currently attached to Next page metadata must be rethought for public pages like `/p/:id`.

Recommendation:

- Keep V2 SPA-first.
- If public preview pages need richer crawler metadata later, solve that with a dedicated Cloudflare edge layer or a focused server-rendered public surface, not by making the whole app SSR again.

### 2. Clerk replaces frontend auth orchestration

Current frontend auth behavior is split across:

- Next proxy middleware
- custom auth cookie logic
- org-selection cookies
- Clerk fallback logic

In V2:

- Use Clerk as the only frontend session authority.
- Use TanStack Router route guards for protected areas.
- Resolve current user and current organization from Convex.
- Store active organization in Convex, not cookie state.
- Remove all dependency on legacy `auth`, `showorg`, and `impersonate` cookies in V2.

### 3. Convex becomes the preferred app-state backend where available

V2 should not continue the old pattern of mixing SWR and ad hoc REST calls for domains that are already on Convex.

Use Convex first for:

- current viewer
- organization membership
- integration list
- post tags
- calendar/listed posts
- public preview/comments where already supported

Use TanStack Query + typed REST client for domains not yet migrated:

- billing
- OAuth app/public API management
- some media flows
- some settings flows
- provider-specific connect flows
- agent/copilot endpoints

### 4. Cloudflare should host the frontend shell, not duplicate backend responsibilities

Cloudflare is a strong fit for:

- static asset hosting
- SPA delivery
- edge redirects
- public caching

Cloudflare is not the place to blindly re-implement the current Next Node-specific behavior.

Specifically:

- The local file-serving upload route in Next should not be recreated inside the Vite app.
- If local uploads are still supported, serve them from the existing backend or a dedicated service.
- If Cloudflare R2 is the desired steady state, prefer moving media access to R2-backed URLs and signed URLs rather than frontend proxying.

## Route Inventory To Migrate

Primary authenticated product routes:

- `/analytics`
- `/launches`
- `/media`
- `/billing`
- `/settings`
- `/third-party`
- `/plugs`
- `/agents`
- `/agents/:id`

Auth routes:

- `/auth`
- `/auth/login`
- `/auth/forgot`
- `/auth/forgot/:token`
- `/auth/activate`
- `/auth/activate/:code`
- `/auth/login-required`

Special routes:

- `/integrations/social/:provider`
- `/oauth/authorize`
- `/p/:id`

Explicitly out of initial V2 scope unless requested:

- the extension/modal surface under `(extension)`
- Next-only local upload route behavior

## Workstreams

### 1. Foundation

Agent should:

- scaffold `apps/frontendV2`
- set up Vite + React + TypeScript
- wire TanStack Router
- add lint/typecheck/build scripts
- add Vitest and Playwright from day one
- define `@gitroom/frontend-v2/*` or equivalent TS path aliases

Deliverable:

- V2 app boots independently and can run in parallel with the current frontend

### 2. Provider and app shell composition

Agent should create the new provider stack:

- Clerk provider
- Convex provider with Clerk bridge
- TanStack Query provider
- Sentry provider/init
- analytics provider(s)
- app config/env provider
- toaster/modal providers if still needed

Deliverable:

- a single root provider tree with no Next runtime dependencies

### 3. Auth and route protection

Agent should:

- replace middleware-based access control with TanStack Router route guards
- define public vs protected route trees
- implement login/logout/session-expired behavior with Clerk-native flows
- model onboarding and post-login redirects without Next proxy rewrites
- implement organization selection from Convex-backed viewer state

Deliverable:

- protected routes cannot render without valid Clerk auth
- organization context is available from app state, not cookies

### 4. Data access layer

Agent should create a strict split:

- `lib/convex/*` for Convex-backed features
- `lib/api/*` for legacy Nest REST features

Rules:

- no raw `fetch('/some-endpoint')` calls from feature components
- no direct SWR usage in V2
- no mixed REST/Convex logic inside UI components

Deliverable:

- typed clients/hooks per domain

### 5. Domain migration

Recommended migration order:

1. Auth shell and current viewer
2. Launches and integration list
3. Analytics
4. Media
5. Settings and team/org management
6. Billing
7. Public API / OAuth app management
8. Agents/copilot
9. Public preview route

Why this order:

- Launches is the core product surface and already has partial Convex work.
- Auth + org context unlock most of the rest of the app.
- Billing and agent flows are important but not ideal for the earliest foundation work.

### 6. Translation and locale handling

Current locale behavior depends on:

- Next proxy header injection
- cookie-based language persistence
- shared i18n config

In V2:

- keep shared locale assets
- use client-side language detection and persistence
- set document direction in the client app shell
- stop relying on middleware to attach translation headers

Deliverable:

- locale switching works without Next middleware

### 7. Uploads and media

This is a risk area.

Agent should:

- inventory every media upload/read path
- separate browser upload behavior from backend file serving behavior
- avoid rebuilding Node file streaming inside the SPA
- prefer direct backend or storage-backed URLs

Cloudflare guidance:

- R2 is a good steady-state target for media delivery
- signed URLs or public asset URLs are preferred over frontend proxy routes

### 8. Testing

### Unit and component testing with Vitest

Minimum requirements:

- route guard behavior
- auth-dependent rendering states
- viewer/org selection logic
- data adapters for Convex and REST
- core form flows
- critical UI state transitions in Launches and Media

Recommended stack:

- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `msw`

### E2E testing with Playwright

Minimum smoke coverage:

- sign in
- sign out
- protected route redirect
- organization switch
- launches page load
- integration list load
- create or edit a scheduled post flow
- media library load
- settings update flow
- billing page navigation
- public preview page render

Recommended CI rule:

- no route is considered migrated until at least one E2E path covers it

### 9. Deployment and cutover

Agent should plan for parallel operation:

- `apps/frontend` remains production until V2 parity is proven
- `apps/frontendV2` is deployed to a separate hostname or preview environment first

Recommended cutover sequence:

1. Deploy V2 to preview/staging
2. Validate auth, org selection, launches, analytics, media, settings
3. Add production telemetry and error monitoring
4. Run Playwright smoke suite on preview and production-like backend
5. Switch primary frontend traffic
6. Keep old Next frontend available briefly for rollback
7. Remove stale frontend routes only after stable cutover

## Risks

### High risk

- auth regression during the cookie-to-Clerk cleanup
- organization switching regressions
- mixed Convex and REST cache inconsistency
- media upload/read behavior differences
- provider OAuth callback edge cases

### Medium risk

- public preview metadata parity
- billing edge cases and subscription state handling
- internationalization regressions
- analytics and Sentry parity

### Lower risk

- route wrapper migration
- layout/styling migration

## Estimated Effort

Rough estimate for a strong senior engineer familiar with React, Clerk, Convex, and the current repo:

- Foundation and shell: 4 to 6 days
- Auth, route guards, and viewer/org state: 4 to 7 days
- Core route migration for launches, analytics, media, settings: 10 to 15 days
- Billing, public API, agents, preview, and long-tail flows: 7 to 12 days
- Testing, hardening, and cutover: 5 to 8 days

Total:

- MVP parity for main app surfaces: about 6 to 9 engineer-weeks
- Safer production-ready parity with hardening: about 8 to 12 engineer-weeks

With two strong engineers working in parallel:

- realistic calendar time is about 4 to 6 weeks for main product parity
- 6 to 8 weeks if extension/modal and all edge cases are included

## Definition Of Done

The migration is done when:

- `apps/frontendV2` is the default web frontend
- authenticated product routes no longer depend on Next runtime APIs
- Clerk is the only frontend session source
- Convex-backed domains use Convex directly
- legacy Nest domains are accessed through typed API modules and TanStack Query
- Vitest covers core units/components
- Playwright covers critical end-to-end flows
- Sentry and analytics are wired in production
- rollback plan is documented
- `apps/frontend` is no longer on the critical path for the main web product

## Explicit Instructions For The Implementing Agent

1. Build `apps/frontendV2` as a fresh app. Do not refactor `apps/frontend` in place.
2. Start with architecture and scaffolding, not feature porting.
3. Keep all new data access behind domain adapters. No raw fetches from view components.
4. Use Clerk React, not `@clerk/nextjs`.
5. Use Convex first where the repo already has Convex support.
6. Use TanStack Query for the remaining Nest-backed domains.
7. Add Vitest and Playwright before migrating major features.
8. Treat media, OAuth callback flows, and billing as explicit risk areas.
9. Do not migrate the extension/modal surface in the first pass unless product scope requires it.
10. Do not port Next middleware behavior one-to-one. Replace it with router guards and explicit client/server boundaries.

## Recommended First Milestone

Milestone 1 should deliver:

- `apps/frontendV2` bootstrapped
- Clerk + Convex + TanStack Router wired
- protected shell working
- current viewer + organization selection working
- `/launches`, `/analytics`, and `/settings` reachable in V2
- Vitest and Playwright running in CI or local automation

If Milestone 1 is stable, the rest of the migration becomes straightforward. If Milestone 1 is shaky, do not continue feature porting until the shell and auth architecture are corrected.

## Related Document

- [`docs/architecture/convex-backend-migration.md`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/docs/architecture/convex-backend-migration.md)
