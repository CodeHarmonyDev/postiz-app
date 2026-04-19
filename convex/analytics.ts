import { v } from 'convex/values';
import { query } from './_generated/server';
import {
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';

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

export const overview = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.object({
    totalPosts: v.number(),
    published: v.number(),
    queued: v.number(),
    drafts: v.number(),
    errors: v.number(),
    totalIntegrations: v.number(),
    activeIntegrations: v.number(),
    needsAttentionIntegrations: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        totalPosts: 0,
        published: 0,
        queued: 0,
        drafts: 0,
        errors: 0,
        totalIntegrations: 0,
        activeIntegrations: 0,
        needsAttentionIntegrations: 0,
      };
    }

    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    const rootPosts = posts.filter((p: any) => !p.parentPostId);

    const integrations = await ctx.db
      .query('integrations')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    return {
      totalPosts: rootPosts.length,
      published: rootPosts.filter((p: any) => p.state === 'PUBLISHED').length,
      queued: rootPosts.filter((p: any) => p.state === 'QUEUE').length,
      drafts: rootPosts.filter((p: any) => p.state === 'DRAFT').length,
      errors: rootPosts.filter((p: any) => p.state === 'ERROR').length,
      totalIntegrations: integrations.length,
      activeIntegrations: integrations.filter(
        (i: any) => !i.disabled && !i.refreshNeeded
      ).length,
      needsAttentionIntegrations: integrations.filter(
        (i: any) => i.disabled || i.refreshNeeded
      ).length,
    };
  },
});

export const postsByIntegration = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(
    v.object({
      integrationId: v.string(),
      integrationName: v.string(),
      providerIdentifier: v.string(),
      picture: v.string(),
      total: v.number(),
      published: v.number(),
      queued: v.number(),
      drafts: v.number(),
      errors: v.number(),
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

    const integrations = await ctx.db
      .query('integrations')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    const rootPosts = posts.filter((p: any) => !p.parentPostId);

    return integrations
      .map((integration: any) => {
        const integrationPosts = rootPosts.filter(
          (p: any) => String(p.integrationId) === String(integration._id)
        );

        return {
          integrationId: String(integration._id),
          integrationName: integration.name,
          providerIdentifier: integration.providerIdentifier,
          picture: integration.pictureUrl || '/no-picture.jpg',
          total: integrationPosts.length,
          published: integrationPosts.filter((p: any) => p.state === 'PUBLISHED')
            .length,
          queued: integrationPosts.filter((p: any) => p.state === 'QUEUE').length,
          drafts: integrationPosts.filter((p: any) => p.state === 'DRAFT').length,
          errors: integrationPosts.filter((p: any) => p.state === 'ERROR').length,
        };
      })
      .sort((a, b) => b.total - a.total);
  },
});

export const postsOverTime = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    days: v.number(),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      published: v.number(),
      queued: v.number(),
      drafts: v.number(),
      errors: v.number(),
      total: v.number(),
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

    const daysCount = Math.min(Math.max(args.days, 7), 90);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - daysCount);
    startDate.setUTCHours(0, 0, 0, 0);

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q: any) =>
        q
          .eq('organizationId', organizationId)
          .eq('isDeleted', false)
          .gte('publishAt', startDate.getTime())
      )
      .collect();

    const rootPosts = posts.filter((p: any) => !p.parentPostId);

    const dayMap = new Map<
      string,
      { published: number; queued: number; drafts: number; errors: number }
    >();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      dayMap.set(d.toISOString().slice(0, 10), {
        published: 0,
        queued: 0,
        drafts: 0,
        errors: 0,
      });
    }

    for (const post of rootPosts) {
      const dayKey = new Date(post.publishAt).toISOString().slice(0, 10);
      const entry = dayMap.get(dayKey);

      if (entry) {
        if (post.state === 'PUBLISHED') entry.published++;
        else if (post.state === 'QUEUE') entry.queued++;
        else if (post.state === 'DRAFT') entry.drafts++;
        else if (post.state === 'ERROR') entry.errors++;
      }
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
        total: counts.published + counts.queued + counts.drafts + counts.errors,
      }));
  },
});
