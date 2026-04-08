# AGENTS.md

## Safety Rules

- Do not read, scan, or access any `.env` or `.env*` files under any circumstances.
- Never use or rely on any data that may exist in those files.
- If a value is required, ask the user directly whether it has been configured instead of attempting to retrieve it.
- If you encounter anything that appears to be a credential or sensitive value, such as `key`, `client_id`, `client_secret`, `secret`, `api_key`, or similar, immediately notify the user and do not process or store it.

## Frontend V2 Directive

- The main frontend migration path is `apps/frontendV2`.
- Treat `apps/frontendV2` as a fresh-start frontend, not an in-place refactor of `apps/frontend`.
- The source of truth for this migration is [`docs/architecture/frontend-v2-migration.md`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/docs/architecture/frontend-v2-migration.md).
- Related backend/platform guidance lives in [`docs/architecture/convex-backend-migration.md`](/Users/grenovales/Documents/develop/CodeHarmony/postiz-app/docs/architecture/convex-backend-migration.md).

## Required Frontend Stack For V2

- Vite
- React 19
- TanStack Router
- Clerk React SDK
- Convex React client with Clerk auth bridging
- Vitest for unit and component testing
- Playwright for end-to-end testing
- Cloudflare deployment for the frontend shell

## Migration Rules

- Do not try to convert `apps/frontend` away from Next.js in place unless the user explicitly requests maintenance on the legacy frontend.
- Prefer building parallel capability in `apps/frontendV2` until parity is proven.
- Do not port Next middleware behavior one-to-one.
- Replace Next auth and routing behavior with TanStack Router guards, Clerk-native auth flows, and explicit client/server boundaries.
- Prefer Convex for domains already migrated or partially migrated to Convex.
- Use Convex as the default server-state layer in V2.
- For any remaining legacy Nest-backed domains, use thin typed API modules or feature-specific hooks only where Convex is not yet available.
- Do not add raw `fetch()` calls directly in feature components in V2.
- Do not use SWR as the long-term data layer in V2.

## Initial Scope Guidance

- Prioritize the main authenticated app surface first.
- Initial migration priority should follow the documented plan:
  - auth shell and current viewer
  - launches and integration list
  - analytics
  - media
  - settings and team/org management
- Do not include the extension/modal surface in the first pass unless the user explicitly asks for it.
- Do not recreate the current Next local upload route inside the Vite SPA without an explicit design decision.

## Delivery Expectation

- `apps/frontendV2` should be able to run in parallel with `apps/frontend`.
- New frontend work should default to the architecture and milestones documented in the migration plan.
