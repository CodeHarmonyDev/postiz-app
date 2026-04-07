import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  makeWorkspaceSlug,
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import {
  organizationListItemValidator,
  organizationSummaryValidator,
} from './lib/validators';

function normalizeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export const listForCurrentUser = query({
  args: {},
  returns: v.array(organizationListItemValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_user_id_and_disabled', (q) =>
        q.eq('userId', user._id).eq('disabled', false)
      )
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);

        if (!organization) {
          return null;
        }

        return {
          organization: {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
            description: organization.description,
            ownerUserId: organization.ownerUserId,
            shortlinkPreference: organization.shortlinkPreference,
            allowTrial: organization.allowTrial,
            isTrailing: organization.isTrailing,
            streakSince: organization.streakSince,
          },
          membership: {
            _id: membership._id,
            organizationId: membership.organizationId,
            userId: membership.userId,
            role: membership.role,
            disabled: membership.disabled,
          },
          isDefault: user.defaultOrganizationId === membership.organizationId,
        };
      })
    );

    return organizations.filter(Boolean) as Array<
      typeof organizations extends Array<infer T> ? Exclude<T, null> : never
    >;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  returns: organizationSummaryValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await requireUserByClerkId(ctx, identity.subject);
    const requestedSlug = args.slug || normalizeSlug(args.name) || makeWorkspaceSlug(identity);

    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', requestedSlug))
      .unique();

    if (existing) {
      throw new Error('Organization slug already exists');
    }

    const organizationId = await ctx.db.insert('organizations', {
      name: args.name.trim(),
      slug: requestedSlug,
      description: args.description?.trim() || undefined,
      ownerUserId: user._id,
      currentApiKeyId: undefined,
      paymentId: undefined,
      streakSince: undefined,
      allowTrial: true,
      isTrailing: false,
      shortlinkPreference: 'ASK',
      legacyOrganizationId: undefined,
    });

    await ctx.db.insert('organizationMemberships', {
      organizationId,
      userId: user._id,
      role: 'ADMIN',
      disabled: false,
      invitedByUserId: user._id,
      legacyUserOrganizationId: undefined,
    });

    if (!user.defaultOrganizationId) {
      await ctx.db.patch(user._id, {
        defaultOrganizationId: organizationId,
      });
    }

    const organization = await ctx.db.get(organizationId);

    if (!organization) {
      throw new Error('Failed to create organization');
    }

    return {
      _id: organization._id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      ownerUserId: organization.ownerUserId,
      shortlinkPreference: organization.shortlinkPreference,
      allowTrial: organization.allowTrial,
      isTrailing: organization.isTrailing,
      streakSince: organization.streakSince,
    };
  },
});

export const getCurrent = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.union(v.null(), organizationSummaryValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const organizationId = args.organizationId || user.defaultOrganizationId;

    if (!organizationId) {
      return null;
    }

    await requireMembership(ctx, user._id, organizationId);
    const organization = await ctx.db.get(organizationId);

    if (!organization) {
      return null;
    }

    return {
      _id: organization._id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      ownerUserId: organization.ownerUserId,
      shortlinkPreference: organization.shortlinkPreference,
      allowTrial: organization.allowTrial,
      isTrailing: organization.isTrailing,
      streakSince: organization.streakSince,
    };
  },
});
