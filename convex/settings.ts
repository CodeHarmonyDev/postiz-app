import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import { roleValidator } from './lib/validators';

async function resolveOrganizationId(
  ctx: any,
  clerkUserId: string,
  requestedOrganizationId?: string
) {
  const user = await requireUserByClerkId(ctx, clerkUserId);
  const organizationId = requestedOrganizationId || user.defaultOrganizationId;

  if (!organizationId) {
    throw new Error('No active organization selected');
  }

  await requireMembership(ctx, user._id, organizationId);
  return { user, organizationId };
}

async function requireAdmin(ctx: any, userId: any, organizationId: any) {
  const membership = await requireMembership(ctx, userId, organizationId);

  if (membership.role !== 'ADMIN' && membership.role !== 'SUPERADMIN') {
    throw new Error('Insufficient permissions');
  }

  return membership;
}

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await requireUserByClerkId(ctx, identity.subject);

    const updates: Record<string, unknown> = {};

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim() || undefined;
    }

    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim() || undefined;
    }

    if (args.bio !== undefined) {
      updates.bio = args.bio.trim() || undefined;
    }

    if (args.timezone !== undefined) {
      updates.timezone = args.timezone.trim() || undefined;
    }

    if (args.language !== undefined) {
      updates.language = args.language.trim() || undefined;
    }

    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const first = (updates.firstName as string) ?? user.firstName ?? '';
      const last = (updates.lastName as string) ?? user.lastName ?? '';
      updates.fullName = [first, last].filter(Boolean).join(' ').trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return null;
  },
});

export const updateOrganization = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    await requireAdmin(ctx, user._id, organizationId);

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const trimmed = args.name.trim();

      if (!trimmed) {
        throw new Error('Organization name is required');
      }

      updates.name = trimmed;
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(organizationId as any, updates);
    }

    return null;
  },
});

export const listMembers = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(
    v.object({
      membershipId: v.string(),
      userId: v.string(),
      email: v.optional(v.string()),
      fullName: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      role: roleValidator,
      disabled: v.boolean(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_organization_id_and_disabled', (q: any) =>
        q.eq('organizationId', organizationId)
      )
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership: any) => {
        const user = await ctx.db.get(membership.userId);

        return {
          membershipId: String(membership._id),
          userId: String(membership.userId),
          email: user?.email,
          fullName: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
          imageUrl: user?.imageUrl,
          role: membership.role,
          disabled: membership.disabled,
          joinedAt: membership._creationTime,
        };
      })
    );

    return members.sort((a, b) => a.joinedAt - b.joinedAt);
  },
});

export const changeMemberRole = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    membershipId: v.string(),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    await requireAdmin(ctx, user._id, organizationId);

    const membership: any = await ctx.db.get(args.membershipId as any);

    if (!membership || membership.organizationId !== organizationId) {
      throw new Error('Membership not found');
    }

    if (String(membership.userId) === String(user._id)) {
      throw new Error('Cannot change your own role');
    }

    await ctx.db.patch(membership._id, {
      role: args.role,
    });

    return null;
  },
});

export const removeMember = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    membershipId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    await requireAdmin(ctx, user._id, organizationId);

    const membership: any = await ctx.db.get(args.membershipId as any);

    if (!membership || membership.organizationId !== organizationId) {
      throw new Error('Membership not found');
    }

    if (String(membership.userId) === String(user._id)) {
      throw new Error('Cannot remove yourself from the organization');
    }

    await ctx.db.patch(membership._id, {
      disabled: true,
    });

    return null;
  },
});

export const listApiKeys = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      prefix: v.string(),
      description: v.optional(v.string()),
      scopes: v.array(v.string()),
      revokedAt: v.optional(v.number()),
      lastUsedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const keys = await ctx.db
      .query('organizationApiKeys')
      .withIndex('by_organization_id_and_revoked_at', (q: any) =>
        q.eq('organizationId', organizationId)
      )
      .collect();

    return keys
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .map((key: any) => ({
        id: String(key._id),
        prefix: key.prefix,
        description: key.description,
        scopes: key.scopes,
        revokedAt: key.revokedAt,
        lastUsedAt: key.lastUsedAt,
        createdAt: key._creationTime,
      }));
  },
});

export const revokeApiKey = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    apiKeyId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    await requireAdmin(ctx, user._id, organizationId);

    const key: any = await ctx.db.get(args.apiKeyId as any);

    if (!key || key.organizationId !== organizationId) {
      throw new Error('API key not found');
    }

    if (key.revokedAt) {
      return null;
    }

    await ctx.db.patch(key._id, {
      revokedAt: Date.now(),
    });

    return null;
  },
});
