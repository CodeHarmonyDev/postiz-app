import type { UserIdentity } from 'convex/server';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type AnyCtx = QueryCtx | MutationCtx;

export async function getIdentity(ctx: AnyCtx) {
  return ctx.auth.getUserIdentity();
}

export async function requireIdentity(ctx: AnyCtx) {
  const identity = await getIdentity(ctx);

  if (!identity) {
    throw new Error('Not authenticated');
  }

  return identity;
}

export async function getUserByClerkId(
  ctx: AnyCtx,
  clerkUserId: string
): Promise<any | null> {
  return ctx.db
    .query('users')
    .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
    .unique();
}

export async function requireUserByClerkId(ctx: AnyCtx, clerkUserId: string) {
  const user = await getUserByClerkId(ctx, clerkUserId);

  if (!user) {
    throw new Error('Authenticated user has not been synced');
  }

  return user;
}

export async function getMembership(
  ctx: AnyCtx,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>
): Promise<Doc<'organizationMemberships'> | null> {
  return ctx.db
    .query('organizationMemberships')
    .withIndex('by_user_id_and_organization_id', (q) =>
      q.eq('userId', userId).eq('organizationId', organizationId)
    )
    .unique();
}

export async function requireMembership(
  ctx: AnyCtx,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>
) {
  const membership = await getMembership(ctx, userId, organizationId);

  if (!membership || membership.disabled) {
    throw new Error('User is not a member of this organization');
  }

  return membership;
}

export function identityProfile(identity: UserIdentity) {
  const fullName = identity.name?.trim();
  const firstName = identity.givenName?.trim() || undefined;
  const lastName = identity.familyName?.trim() || undefined;
  const email = identity.email?.trim().toLowerCase() || undefined;
  const imageUrl = identity.pictureUrl?.trim() || undefined;
  const timezone = identity.timezone?.trim() || undefined;
  const language = identity.language?.trim() || undefined;

  return {
    clerkUserId: identity.subject,
    email,
    firstName,
    lastName,
    fullName:
      fullName ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      undefined,
    imageUrl,
    timezone,
    language,
  };
}

export function makeWorkspaceName(identity: UserIdentity) {
  const preferredName =
    identity.name?.trim() ||
    identity.givenName?.trim() ||
    identity.nickname?.trim() ||
    identity.email?.split('@')[0] ||
    'Postiz';

  return preferredName.endsWith('s')
    ? `${preferredName}' Workspace`
    : `${preferredName}'s Workspace`;
}

export function makeWorkspaceSlug(identity: UserIdentity) {
  const seed =
    identity.preferredUsername ||
    identity.nickname ||
    identity.email?.split('@')[0] ||
    identity.subject;

  const normalized = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const suffix = identity.subject.slice(-8).toLowerCase();
  return `${normalized || 'workspace'}-${suffix}`;
}
