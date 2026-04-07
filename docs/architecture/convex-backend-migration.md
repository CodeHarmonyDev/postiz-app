# Convex Backend Migration Audit

## Current project shape

- Frontend: Next.js App Router in `apps/frontend`.
- Private backend: NestJS API in `apps/backend`.
- Public backend API: `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts`.
- Async backend: Temporal worker/orchestrator in `apps/orchestrator`.
- CLI/background commands: `apps/commands`.
- Data layer: Prisma over PostgreSQL in `libraries/nestjs-libraries/src/database/prisma`.
- Cross-cutting infra: Redis, Stripe, Sentry, upload/storage providers, OpenAI, email providers, many social OAuth integrations.

## Findings

### 1. This is not just a backend service swap

The current app couples Prisma deeply into:

- NestJS controllers and services
- Temporal activities and workflows
- frontend types and UI state
- shared DTOs and helpers

`@prisma/client` is imported across the backend, orchestrator, and frontend, which means the migration has to replace the application contract, not only the database driver.

### 2. The backend surface area is broad

Authenticated NestJS controllers currently cover:

- `/auth`
- `/user`
- `/analytics`
- `/integrations`
- `/posts`
- `/media`
- `/billing`
- `/notifications`
- `/webhooks`
- `/signatures`
- `/autopost`
- `/sets`
- `/third-party`
- `/oauth`
- `/user/oauth-app`
- `/user/approved-apps`
- `/announcements`

There is also a separate public API under `/public/v1` for uploads, posts, integrations, analytics, notifications, and media/video generation.

### 3. Auth is currently custom and request-cookie based

Today the app relies on:

- a custom JWT in the `auth` cookie/header
- organization selection in `showorg`
- optional impersonation in `impersonate`
- auth middleware in `apps/backend/src/services/auth/auth.middleware.ts`
- proxy redirects in `apps/frontend/src/proxy.ts`

Clerk migration therefore needs two layers:

- identity and session from Clerk
- app authorization and organization membership in Convex

### 4. Prisma models map well to Convex, but not one-to-one

Current core entities include:

- `User`, `Organization`, `UserOrganization`
- `Integration`, `Post`, `Tags`, `Comments`
- `Media`, `Webhooks`, `Signatures`, `AutoPost`
- `Subscription`, `Customer`
- `OAuthApp`, `OAuthAuthorization`
- `Notifications`, `Announcement`

Convex favors document-oriented access patterns and index-first queries, so some relationships should be normalized differently:

- `UserOrganization` becomes a first-class `organizationMemberships` table.
- org API keys should move out of the organization document into a dedicated `organizationApiKeys` table.
- integration tokens should live in a dedicated internal-only `integrationCredentials` table instead of the public integration shape.
- many current `deletedAt` filters should become indexable `isDeleted` plus optional `deletedAt`.

### 5. Temporal is the second half of the migration

Important behavior currently lives outside HTTP:

- scheduled publishing workflows
- auto-post workflows
- refresh token workflows
- digest email workflows
- streak workflows
- missing-post recovery logic

Convex can replace a large share of CRUD APIs early, but the Temporal estate should be migrated in phases to Convex actions, scheduled functions, and internal mutations. That is a separate workstream from the initial data/API move.

### 6. The frontend assumes backend-specific response shapes

The frontend makes many direct `fetch()` calls against current Nest routes, for example:

- `/integrations/*`
- `/posts/*`
- `/billing/*`
- `/media/*`
- `/settings/*`
- `/notifications/*`

This means the migration should move by domain slice and introduce Convex-backed hooks/adapters rather than attempt a single cutover of all fetches at once.

## Target architecture

### Identity

- Clerk handles sign-in, session management, MFA, and external identity providers.
- Convex stores application users, organizations, memberships, subscriptions, OAuth apps, and API keys.
- Clerk identity is resolved in Convex with `ctx.auth.getUserIdentity()`.
- The first authenticated Convex mutation syncs the user and creates a personal workspace if needed.

### Data

Convex becomes the primary application backend for:

- users and memberships
- organizations and org settings
- integrations and integration metadata
- posts, tags, comments, media metadata
- notifications, signatures, webhooks, autoposts
- public API app records and authorizations

External files and provider credentials remain behind server-only/internal functions.

### API style

- Replace NestJS CRUD controllers with Convex queries/mutations by domain.
- Use Convex actions for provider fan-out, uploads, Stripe calls, email sending, and long-running work.
- Keep sensitive write paths private via internal functions and server-side route handlers when needed.

### Async and jobs

- Replace token refresh loops with Convex scheduled/internal flows.
- Replace posting workflows incrementally with Convex actions and scheduled retries.
- Keep Temporal in place until each workflow class has a tested Convex successor.

## Initial implementation in this repo

This pass adds the migration foundation:

- Convex schema in [`convex/schema.ts`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/convex/schema.ts)
- Clerk issuer config in [`convex/auth.config.ts`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/convex/auth.config.ts)
- Auth-aware Convex helpers in [`convex/lib/auth.ts`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/convex/lib/auth.ts)
- Initial Convex functions for users, organizations, integrations, and posts
- Next.js provider wiring for Clerk + Convex
- `proxy.ts` compatibility wrapper so existing request flow keeps working while Clerk is enabled

## Migration phases

### Phase 1: Identity and tenancy

- Enable Clerk and Convex in production and development.
- Sync authenticated users into Convex.
- Create and manage active organizations/memberships in Convex.
- Replace frontend reliance on the custom `auth` cookie for new Convex-backed surfaces.

### Phase 2: Core read models

- Move organization, user profile, notifications, tags, signatures, and integration list reads to Convex queries.
- Replace Prisma types in the frontend with Convex/domain return types.

### Phase 3: Core write models

- Move post creation, edits, grouping, tags, comments, media metadata, webhooks, and autopost configuration to Convex mutations.
- Add server-side/internal actions for uploads and external provider side effects.

### Phase 4: Public API and credentials

- Rebuild public API auth around dedicated hashed API keys and OAuth app authorizations stored in Convex.
- Move SDK/public endpoints to server handlers backed by Convex.

### Phase 5: Orchestration

- Migrate Temporal workflows one slice at a time:
  - token refresh
  - scheduling/publishing
  - auto-posting
  - notification digests
  - streaks

## Risks and constraints

- The current app has a large provider integration surface; token storage and refresh logic must remain server-only and never be exposed through public queries.
- Billing is highly sensitive; Stripe migration should happen after tenancy and authorization are stable in Convex.
- Existing frontend redirects and cookie assumptions must be removed carefully to avoid locking users out during the transition.
- Any OAuth app secret or API key migration should store only hashed secrets for app-managed credentials.

## Recommended next slices

1. Replace current `/user/self`, `/user/organizations`, and org selection flows with Convex.
2. Move `/integrations/list` and related read-only integration views to Convex.
3. Move post listing/calendar reads to Convex.
4. Introduce Convex-backed write flows for scheduling posts.
5. After those are stable, start retiring matching Prisma services and NestJS controllers.
