import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import {
  identityProfile,
  makeWorkspaceName,
  makeWorkspaceSlug,
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import {
  organizationSummaryValidator,
  viewerStateValidator,
} from './lib/validators';

async function getViewerStateForUser(ctx: any, user: any) {
  const defaultOrganizationId = user.defaultOrganizationId;
  const membership =
    defaultOrganizationId
      ? await ctx.db
          .query('organizationMemberships')
          .withIndex('by_user_id_and_organization_id', (q: any) =>
            q.eq('userId', user._id).eq('organizationId', defaultOrganizationId)
          )
          .unique()
      : null;

  const activeMembership =
    membership && !membership.disabled
      ? membership
      : (
          await ctx.db
            .query('organizationMemberships')
            .withIndex('by_user_id_and_disabled', (q: any) =>
              q.eq('userId', user._id).eq('disabled', false)
            )
            .collect()
        )[0] || null;

  if (!activeMembership) {
    return null;
  }

  const organization = await ctx.db.get(activeMembership.organizationId);

  if (!organization) {
    return null;
  }

  const subscriptions = await ctx.db
    .query('subscriptions')
    .withIndex('by_organization_id', (q: any) =>
      q.eq('organizationId', organization._id)
    )
    .collect();

  const subscription =
    subscriptions
      .filter((entry: any) => !entry.deletedAt)
      .sort((a: any, b: any) => b._creationTime - a._creationTime)[0] || null;

  return {
    user: {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      timezone: user.timezone,
      language: user.language,
      bio: user.bio,
      audience: user.audience,
      isSuperAdmin: user.isSuperAdmin,
      defaultOrganizationId: user.defaultOrganizationId,
    },
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
      _id: activeMembership._id,
      organizationId: activeMembership.organizationId,
      userId: activeMembership.userId,
      role: activeMembership.role,
      disabled: activeMembership.disabled,
    },
    subscription: subscription
      ? {
          _id: subscription._id,
          organizationId: subscription.organizationId,
          tier: subscription.tier,
          period: subscription.period,
          totalChannels: subscription.totalChannels,
          isLifetime: subscription.isLifetime,
          identifier: subscription.identifier,
          cancelAt: subscription.cancelAt,
          deletedAt: subscription.deletedAt,
        }
      : null,
  };
}

export const current = query({
  args: {},
  returns: v.union(v.null(), viewerStateValidator),
  handler: async (ctx) => {
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

    return getViewerStateForUser(ctx, user);
  },
});

export const syncViewer = mutation({
  args: {},
  returns: viewerStateValidator,
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const profile = identityProfile(identity);

    let user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: profile.clerkUserId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        imageUrl: profile.imageUrl,
        timezone: profile.timezone,
        language: profile.language,
        bio: undefined,
        audience: 0,
        isSuperAdmin: false,
        defaultOrganizationId: undefined,
        lastReadNotificationsAt: Date.now(),
        lastActiveAt: Date.now(),
        legacyUserId: undefined,
      });

      const organizationId = await ctx.db.insert('organizations', {
        name: makeWorkspaceName(identity),
        slug: makeWorkspaceSlug(identity),
        description: 'Personal workspace created during the Convex migration.',
        ownerUserId: userId,
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
        userId,
        role: 'ADMIN',
        disabled: false,
        invitedByUserId: undefined,
        legacyUserOrganizationId: undefined,
      });

      await ctx.db.patch(userId, {
        defaultOrganizationId: organizationId,
      });

      user = await ctx.db.get(userId);
    } else {
      const updates: Record<string, unknown> = {};

      if (profile.email !== user.email) {
        updates.email = profile.email;
      }
      if (profile.firstName !== user.firstName) {
        updates.firstName = profile.firstName;
      }
      if (profile.lastName !== user.lastName) {
        updates.lastName = profile.lastName;
      }
      if (profile.fullName !== user.fullName) {
        updates.fullName = profile.fullName;
      }
      if (profile.imageUrl !== user.imageUrl) {
        updates.imageUrl = profile.imageUrl;
      }
      if (profile.timezone !== user.timezone) {
        updates.timezone = profile.timezone;
      }
      if (profile.language !== user.language) {
        updates.language = profile.language;
      }

      updates.lastActiveAt = Date.now();

      await ctx.db.patch(user._id, updates);
      user = await ctx.db.get(user._id);
    }

    if (!user) {
      throw new Error('Failed to load the synced viewer');
    }

    const state = await getViewerStateForUser(ctx, user);

    if (!state) {
      throw new Error('Viewer has no active organization');
    }

    return state;
  },
});

export const setDefaultOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
  },
  returns: organizationSummaryValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await requireUserByClerkId(ctx, identity.subject);
    await requireMembership(ctx, user._id, args.organizationId);

    await ctx.db.patch(user._id, {
      defaultOrganizationId: args.organizationId,
      lastActiveAt: Date.now(),
    });

    const organization = await ctx.db.get(args.organizationId);

    if (!organization) {
      throw new Error('Organization not found');
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

export const touchLastActive = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        lastActiveAt: Date.now(),
      });
    }

    return null;
  },
});
