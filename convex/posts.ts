import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import {
  postCalendarItemValidator,
  postCalendarResponseValidator,
  postListResponseValidator,
  postStateValidator,
  postSummaryValidator,
} from './lib/validators';

function toUtcMinuteString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 16) + ':00';
}

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0
  );
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

async function mapPostToCalendarItem(
  ctx: any,
  post: any,
  publishAt: number,
  actualDate?: number
) {
  const integration = await ctx.db.get(post.integrationId);

  if (!integration || integration.isDeleted) {
    return null;
  }

  const postTags = await ctx.db
    .query('postTags')
    .withIndex('by_post_id_and_tag_id', (q: any) => q.eq('postId', post._id))
    .collect();

  const tags = (
    await Promise.all(
      postTags.map(async (postTag: any) => {
        const tag = await ctx.db.get(postTag.tagId);

        if (!tag || tag.isDeleted) {
          return null;
        }

        return {
          tag: {
            id: String(tag._id),
            name: tag.name,
            color: tag.color,
          },
        };
      })
    )
  ).filter(Boolean);

  return {
    id: String(post._id),
    content: post.content,
    publishDate: toUtcMinuteString(publishAt),
    releaseURL: post.releaseUrl,
    releaseId: post.releaseId,
    state: post.state,
    group: post.groupId,
    tags,
    integration: {
      id: String(integration._id),
      providerIdentifier: integration.providerIdentifier,
      name: integration.name,
      picture: integration.pictureUrl || '/no-picture.jpg',
    },
    intervalInDays: post.repeatIntervalDays,
    actualDate: actualDate ? toUtcMinuteString(actualDate) : undefined,
  };
}

async function getRootPostsForOrganization(ctx: any, organizationId: any) {
  const posts = await ctx.db
    .query('posts')
    .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q: any) =>
      q.eq('organizationId', organizationId).eq('isDeleted', false)
    )
    .collect();

  return posts.filter((post: any) => !post.parentPostId);
}

async function filterPostsByCustomer(
  ctx: any,
  posts: Array<any>,
  customerId?: string
) {
  if (!customerId) {
    return posts;
  }

  const matches = await Promise.all(
    posts.map(async (post) => {
      const integration = await ctx.db.get(post.integrationId);
      return integration && String(integration.customerId || '') === customerId;
    })
  );

  return posts.filter((_, index) => matches[index]);
}

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

export const listForCalendar = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    startAt: v.number(),
    endAt: v.number(),
    customerId: v.optional(v.string()),
  },
  returns: postCalendarResponseValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { posts: [] };
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const rootPosts = await getRootPostsForOrganization(ctx, organizationId);
    const scopedPosts = await filterPostsByCustomer(
      ctx,
      rootPosts,
      args.customerId
    );

    const expanded = (
      await Promise.all(
        scopedPosts.flatMap((post) => {
          if (!post.repeatIntervalDays) {
            if (post.publishAt < args.startAt || post.publishAt > args.endAt) {
              return [];
            }

            return [mapPostToCalendarItem(ctx, post, post.publishAt)];
          }

          const items: Array<Promise<any>> = [];
          let occurrenceAt = post.publishAt;

          while (occurrenceAt <= args.endAt) {
            if (occurrenceAt >= args.startAt) {
              items.push(
                mapPostToCalendarItem(ctx, post, occurrenceAt, post.publishAt)
              );
            }

            occurrenceAt += post.repeatIntervalDays * 24 * 60 * 60 * 1000;
          }

          return items;
        })
      )
    ).filter(isDefined)
      .sort((a: any, b: any) =>
        a.publishDate.localeCompare(b.publishDate)
      );

    return {
      posts: expanded,
    };
  },
});

export const listUpcoming = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    customerId: v.optional(v.string()),
    page: v.number(),
    limit: v.number(),
  },
  returns: postListResponseValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        posts: [],
        total: 0,
        page: args.page,
        limit: args.limit,
        hasMore: false,
      };
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const now = Date.now();
    const rootPosts = await getRootPostsForOrganization(ctx, organizationId);
    const scopedPosts = await filterPostsByCustomer(
      ctx,
      rootPosts,
      args.customerId
    );

    const upcomingPosts = scopedPosts
      .filter((post) => !post.repeatIntervalDays && post.publishAt >= now)
      .sort((a, b) => a.publishAt - b.publishAt);

    const start = args.page * args.limit;
    const pagePosts = upcomingPosts.slice(start, start + args.limit);
    const mappedPosts = (
      await Promise.all(
        pagePosts.map((post) => mapPostToCalendarItem(ctx, post, post.publishAt))
      )
    ).filter(isDefined);

    return {
      posts: mappedPosts,
      total: upcomingPosts.length,
      page: args.page,
      limit: args.limit,
      hasMore: start + args.limit < upcomingPosts.length,
    };
  },
});

export const findNextAvailableSlot = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    integrationId: v.optional(v.string()),
  },
  returns: v.object({
    date: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { date: toUtcMinuteString(Date.now()) };
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const integrations = (
      await ctx.db
        .query('integrations')
        .withIndex('by_organization_id_and_is_deleted', (q: any) =>
          q.eq('organizationId', organizationId).eq('isDeleted', false)
        )
        .collect()
    ).filter((integration: any) => {
      if (integration.disabled) {
        return false;
      }

      if (args.integrationId) {
        return String(integration._id) === args.integrationId;
      }

      return true;
    });

    const uniqueTimes = Array.from(
      new Set(
        integrations.flatMap((integration: any) => integration.postingTimes || [])
      )
    ).sort((a, b) => a - b);

    if (uniqueTimes.length === 0) {
      return { date: toUtcMinuteString(Date.now()) };
    }

    let currentDayStart = startOfUtcDay(Date.now());

    while (true) {
      const dayStart = currentDayStart;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
      const occupied = await ctx.db
        .query('posts')
        .withIndex('by_organization_id_and_is_deleted_and_publish_at', (q: any) =>
          q
            .eq('organizationId', organizationId)
            .eq('isDeleted', false)
            .gte('publishAt', dayStart)
            .lte('publishAt', dayEnd)
        )
        .collect();

      const nextMinute = uniqueTimes.find((time) => {
        const candidateAt = dayStart + time * 60 * 1000;

        if (candidateAt <= Date.now()) {
          return false;
        }

        return !occupied.some((post: any) => post.publishAt === candidateAt);
      });

      if (typeof nextMinute === 'number') {
        return {
          date: toUtcMinuteString(dayStart + nextMinute * 60 * 1000),
        };
      }

      currentDayStart += 24 * 60 * 60 * 1000;
    }
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
