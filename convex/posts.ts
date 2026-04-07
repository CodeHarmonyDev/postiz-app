import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import { postStateValidator, postSummaryValidator } from './lib/validators';

async function resolvePostScope(
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

export const listForCurrentOrganization = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    startAt: v.number(),
    endAt: v.number(),
  },
  returns: v.array(postSummaryValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q) =>
        q
          .eq('organizationId', organizationId)
          .eq('isDeleted', false)
          .gte('publishAt', args.startAt)
          .lte('publishAt', args.endAt)
      )
      .collect();

    return posts.map((post) => ({
      _id: post._id,
      organizationId: post.organizationId,
      integrationId: post.integrationId,
      authorUserId: post.authorUserId,
      state: post.state,
      publishAt: post.publishAt,
      content: post.content,
      groupId: post.groupId,
      title: post.title,
      description: post.description,
      releaseId: post.releaseId,
      releaseUrl: post.releaseUrl,
      settingsJson: post.settingsJson,
      imageJson: post.imageJson,
      repeatIntervalDays: post.repeatIntervalDays,
      errorMessage: post.errorMessage,
    }));
  },
});

export const create = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    groupId: v.optional(v.string()),
    posts: v.array(
      v.object({
        integrationId: v.id('integrations'),
        content: v.string(),
        publishAt: v.number(),
        state: postStateValidator,
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        settingsJson: v.optional(v.string()),
        imageJson: v.optional(v.string()),
        repeatIntervalDays: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({
    groupId: v.string(),
    postIds: v.array(v.id('posts')),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    if (args.posts.length === 0) {
      throw new Error('At least one post is required');
    }

    const groupId =
      args.groupId ||
      `group_${organizationId}_${Date.now()}_${identity.subject.slice(-6)}`;

    const postIds: Array<any> = [];

    for (const item of args.posts) {
      const integration = await ctx.db.get(item.integrationId);

      if (!integration || integration.organizationId !== organizationId) {
        throw new Error('Integration does not belong to the active organization');
      }

      const postId = await ctx.db.insert('posts', {
        organizationId,
        integrationId: item.integrationId,
        authorUserId: user._id,
        state: item.state,
        publishAt: item.publishAt,
        content: item.content,
        groupId,
        title: item.title,
        description: item.description,
        parentPostId: undefined,
        releaseId: undefined,
        releaseUrl: undefined,
        settingsJson: item.settingsJson,
        imageJson: item.imageJson,
        submittedForOrderId: undefined,
        submittedForOrganizationId: undefined,
        approvalState: 'NO',
        lastMessageId: undefined,
        repeatIntervalDays: item.repeatIntervalDays,
        errorMessage: undefined,
        isDeleted: false,
        deletedAt: undefined,
        legacyPostId: undefined,
      });

      postIds.push(postId);
    }

    return { groupId, postIds };
  },
});
