import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import {
  postComposerPayloadValidator,
  postComposerResultValidator,
  postCalendarItemValidator,
  postCalendarResponseValidator,
  postGroupResponseValidator,
  postListResponseValidator,
  postStateValidator,
  postSummaryValidator,
  publicCommentValidator,
  publicCommentsResponseValidator,
  publicPreviewResponseValidator,
  tagListResponseValidator,
  tagSummaryValidator,
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

function makeGroupId(seed: string) {
  const normalizedSeed = seed
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(-8)
    .toLowerCase();

  return `grp_${Date.now()}_${normalizedSeed || 'post'}`;
}

function parsePublishAt(type: 'draft' | 'schedule' | 'now' | 'update', date: string) {
  if (type === 'now') {
    return Date.now();
  }

  const publishAt = Date.parse(date);

  if (Number.isNaN(publishAt)) {
    throw new Error('Invalid publish date');
  }

  return publishAt;
}

function shouldAskForShortlink(messages: Array<string>) {
  return messages.some((message) => /https?:\/\/\S+/i.test(message));
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

async function mapPostToGroupItem(
  ctx: any,
  post: any,
  includeIntegration: boolean
): Promise<any> {
  const integration = includeIntegration ? await ctx.db.get(post.integrationId) : null;

  if (includeIntegration && (!integration || integration.isDeleted)) {
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
  ).filter(isDefined);

  return {
    id: String(post._id),
    group: post.groupId,
    content: post.content,
    publishDate: toUtcMinuteString(post.publishAt),
    actualDate: undefined as string | undefined,
    releaseId: post.releaseId,
    releaseURL: post.releaseUrl,
    state: post.state,
    delay: post.delayMinutes || 0,
    image: JSON.parse(post.imageJson || '[]'),
    settings: undefined as unknown,
    tags,
    integration: includeIntegration && integration
      ? {
          id: String(integration._id),
          providerIdentifier: integration.providerIdentifier,
          name: integration.name,
          picture: integration.pictureUrl || '/no-picture.jpg',
        }
      : undefined,
    parentPostId: post.parentPostId ? String(post.parentPostId) : undefined,
    intervalInDays: post.repeatIntervalDays,
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

async function listGroupPosts(ctx: any, organizationId: any, groupId: string) {
  return ctx.db
    .query('posts')
    .withIndex('by_organization_id_and_group_id', (q: any) =>
      q.eq('organizationId', organizationId).eq('groupId', groupId)
    )
    .collect();
}

function orderGroupPosts(groupPosts: Array<any>, rootPostId?: string) {
  const activePosts = groupPosts.filter((post: any) => !post.isDeleted);
  const rootPost =
    activePosts.find((post: any) =>
      rootPostId ? String(post._id) === rootPostId : !post.parentPostId
    ) ||
    activePosts.find((post: any) => !post.parentPostId) ||
    null;

  if (!rootPost) {
    return [] as Array<any>;
  }

  const orderedPosts: Array<any> = [];
  let currentPost: any = rootPost;

  while (currentPost) {
    orderedPosts.push(currentPost);
    const currentPostId = String(currentPost._id);
    currentPost =
      activePosts.find(
        (post: any) =>
          post.parentPostId && String(post.parentPostId) === currentPostId
      ) || null;
  }

  return orderedPosts;
}

async function getPublicPostRecord(ctx: any, postId: string) {
  try {
    return (await ctx.db.get(postId as any)) as any;
  } catch {
    return null;
  }
}

async function replaceRootPostTags(
  ctx: any,
  organizationId: any,
  rootPostId: any,
  tags: Array<{ label: string; value: string }>
) {
  const currentTags = await ctx.db
    .query('postTags')
    .withIndex('by_post_id_and_tag_id', (q: any) => q.eq('postId', rootPostId))
    .collect();

  await Promise.all(currentTags.map((row: any) => ctx.db.delete(row._id)));

  const uniqueNames = Array.from(
    new Set(
      tags
        .map((tag) => tag.label?.trim())
        .filter((tagName): tagName is string => Boolean(tagName))
    )
  );

  if (!uniqueNames.length) {
    return;
  }

  const organizationTags = await ctx.db
    .query('tags')
    .withIndex('by_organization_id_and_is_deleted', (q: any) =>
      q.eq('organizationId', organizationId).eq('isDeleted', false)
    )
    .collect();

  const matchingTags = organizationTags.filter((tag: any) =>
    uniqueNames.includes(tag.name)
  );

  await Promise.all(
    matchingTags.map((tag: any) =>
      ctx.db.insert('postTags', {
        postId: rootPostId,
        tagId: tag._id,
      })
    )
  );
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
      delayMinutes: post.delayMinutes,
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

export const getGroup = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    groupId: v.string(),
  },
  returns: v.union(v.null(), postGroupResponseValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_group_id', (q: any) =>
        q.eq('organizationId', organizationId).eq('groupId', args.groupId)
      )
      .collect();

    const activePosts = posts.filter((post: any) => !post.isDeleted);
    const rootPosts = activePosts.filter((post: any) => !post.parentPostId);
    const rootPost = rootPosts[0];

    if (!rootPost) {
      return null;
    }

    const orderedPosts: Array<any> = [];
    let currentPost: any = rootPost;

    while (currentPost) {
      orderedPosts.push(currentPost);
      const currentPostId: string = String(currentPost._id);
      currentPost =
        activePosts.find(
          (post: any) => post.parentPostId && String(post.parentPostId) === currentPostId
        ) || null;
    }

    const mappedPosts = (
      await Promise.all(
        orderedPosts.map((post, index) =>
          mapPostToGroupItem(ctx, post, index === 0)
        )
      )
    ).filter(isDefined);

    const rootIntegration = await ctx.db.get(rootPost.integrationId);

    if (!rootIntegration || rootIntegration.isDeleted) {
      return null;
    }

    return {
      group: rootPost.groupId,
      posts: mappedPosts,
      integrationPicture: rootIntegration.pictureUrl || '/no-picture.jpg',
      integration: String(rootIntegration._id),
      settings: JSON.parse(rootPost.settingsJson || '{}'),
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

export const getPublicPreview = query({
  args: {
    postId: v.string(),
  },
  returns: v.union(v.null(), publicPreviewResponseValidator),
  handler: async (ctx, args) => {
    const rootPost = await getPublicPostRecord(ctx, args.postId);

    if (!rootPost || rootPost.isDeleted) {
      return null;
    }

    const integration: any = await ctx.db.get(rootPost.integrationId);

    if (!integration || integration.isDeleted) {
      return null;
    }

    const groupPosts = await listGroupPosts(
      ctx,
      rootPost.organizationId,
      rootPost.groupId
    );
    const orderedPosts = orderGroupPosts(groupPosts, String(rootPost._id));

    return {
      integration: {
        id: String(integration._id),
        name: integration.name,
        picture: integration.pictureUrl || '/no-picture.jpg',
        providerIdentifier: integration.providerIdentifier,
        profile: integration.profile,
      },
      posts: orderedPosts.map((post: any) => ({
        id: String(post._id),
        content: post.content,
        publishDate: new Date(post.publishAt).toISOString(),
        image: JSON.parse(post.imageJson || '[]'),
      })),
    };
  },
});

export const listPublicComments = query({
  args: {
    postId: v.string(),
  },
  returns: publicCommentsResponseValidator,
  handler: async (ctx, args) => {
    const post = await getPublicPostRecord(ctx, args.postId);

    if (!post || post.isDeleted) {
      return { comments: [] };
    }

    const comments = await ctx.db
      .query('comments')
      .withIndex('by_post_id_and_is_deleted', (q: any) =>
        q.eq('postId', post._id).eq('isDeleted', false)
      )
      .collect();

    return {
      comments: comments.map((comment: any) => ({
        id: String(comment._id),
        userId: String(comment.userId),
        content: comment.content,
        createdAt: comment._creationTime,
      })),
    };
  },
});

export const createPublicComment = mutation({
  args: {
    postId: v.string(),
    comment: v.string(),
  },
  returns: publicCommentValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await requireUserByClerkId(ctx, identity.subject);
    const post = await getPublicPostRecord(ctx, args.postId);
    const content = args.comment.trim();

    if (!post || post.isDeleted) {
      throw new Error('Post not found');
    }

    if (!content) {
      throw new Error('Comment is required');
    }

    const commentId = await ctx.db.insert('comments', {
      organizationId: post.organizationId,
      postId: post._id,
      userId: user._id,
      content,
      isDeleted: false,
      deletedAt: undefined,
      legacyCommentId: undefined,
    });

    const comment = await ctx.db.get(commentId);

    if (!comment) {
      throw new Error('Comment not found');
    }

    return {
      id: String(comment._id),
      userId: String(comment.userId),
      content: comment.content,
      createdAt: comment._creationTime,
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

export const deleteGroup = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    groupId: v.string(),
  },
  returns: v.object({
    error: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_organization_id_and_group_id', (q: any) =>
        q.eq('organizationId', organizationId).eq('groupId', args.groupId)
      )
      .collect();

    await Promise.all(
      posts.map((post: any) =>
        ctx.db.patch(post._id, {
          isDeleted: true,
          deletedAt: Date.now(),
        })
      )
    );

    return { error: true };
  },
});

export const changeDate = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    postId: v.id('posts'),
    publishAt: v.number(),
    action: v.union(v.literal('schedule'), v.literal('update')),
  },
  returns: v.object({
    id: v.string(),
    publishDate: v.string(),
    state: postStateValidator,
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const post = await ctx.db.get(args.postId);

    if (!post || post.organizationId !== organizationId || post.isDeleted) {
      throw new Error('Post not found');
    }

    const nextState =
      args.action === 'schedule'
        ? post.state === 'DRAFT'
          ? 'DRAFT'
          : 'QUEUE'
        : post.state;

    await ctx.db.patch(post._id, {
      publishAt: args.publishAt,
      ...(args.action === 'schedule'
        ? {
            state: nextState,
            releaseId: undefined,
            releaseUrl: undefined,
          }
        : {}),
    });

    return {
      id: String(post._id),
      publishDate: toUtcMinuteString(args.publishAt),
      state: nextState,
    };
  },
});

export const shouldShortlink = query({
  args: {
    messages: v.array(v.string()),
  },
  returns: v.object({
    ask: v.boolean(),
  }),
  handler: async (_ctx, args) => {
    return {
      ask: shouldAskForShortlink(args.messages),
    };
  },
});

export const upsertComposerPosts = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    payload: postComposerPayloadValidator,
  },
  returns: v.array(postComposerResultValidator),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    if (args.payload.posts.length === 0) {
      throw new Error('At least one post is required');
    }

    const publishAt = parsePublishAt(args.payload.type, args.payload.date);
    const createdPosts: Array<any> = [];

    for (const input of args.payload.posts) {
      const integration = await ctx.db.get(input.integration.id);

      if (
        !integration ||
        integration.organizationId !== organizationId ||
        integration.isDeleted
      ) {
        throw new Error('Integration does not belong to the active organization');
      }

      const nextGroupId = makeGroupId(String(integration._id));
      let parentPostId: any = undefined;
      let rootPostId: any = undefined;
      const retainedPostIds = new Set<string>();

      for (const value of input.value) {
        const existingPost: any =
          value.id && args.payload.type !== 'now'
            ? await ctx.db.get(value.id as any)
            : null;

        const nextState =
          args.payload.type === 'update' && existingPost
            ? existingPost.state
            : args.payload.type === 'draft'
            ? 'DRAFT'
            : 'QUEUE';

        const basePatch: any = {
          organizationId,
          integrationId: input.integration.id,
          authorUserId: user._id,
          state: nextState,
          publishAt,
          content: value.content,
          groupId: nextGroupId,
          title: existingPost?.title,
          description: existingPost?.description,
          parentPostId,
          delayMinutes: value.delay || 0,
          releaseId: existingPost?.releaseId,
          releaseUrl: existingPost?.releaseUrl,
          settingsJson: JSON.stringify(input.settings || {}),
          imageJson: JSON.stringify(value.image || []),
          submittedForOrderId: existingPost?.submittedForOrderId,
          submittedForOrganizationId: existingPost?.submittedForOrganizationId,
          approvalState: existingPost?.approvalState || 'NO',
          lastMessageId: existingPost?.lastMessageId,
          repeatIntervalDays: args.payload.inter,
          errorMessage: existingPost?.errorMessage,
          isDeleted: false,
          deletedAt: undefined,
          legacyPostId: existingPost?.legacyPostId,
        };

        let currentPostId = existingPost?._id;

        if (
          existingPost &&
          existingPost.organizationId === organizationId &&
          !existingPost.isDeleted
        ) {
          await ctx.db.patch(existingPost._id, basePatch);
        } else {
          currentPostId = await ctx.db.insert('posts', basePatch);
        }

        if (!currentPostId) {
          throw new Error('Unable to save post');
        }

        retainedPostIds.add(String(currentPostId));

        if (!rootPostId) {
          rootPostId = currentPostId;
        }

        parentPostId = currentPostId;
      }

      if (!rootPostId) {
        throw new Error('At least one post value is required');
      }

      if (input.group) {
        const previousGroupPosts = await listGroupPosts(ctx, organizationId, input.group);

        await Promise.all(
          previousGroupPosts
            .filter((post: any) => !retainedPostIds.has(String(post._id)))
            .map((post: any) =>
              ctx.db.patch(post._id, {
                isDeleted: true,
                deletedAt: Date.now(),
                parentPostId: undefined,
              })
            )
        );
      }

      await replaceRootPostTags(ctx, organizationId, rootPostId, args.payload.tags);

      createdPosts.push({
        postId: String(rootPostId),
        integration: String(input.integration.id),
        groupId: nextGroupId,
      });
    }

    return createdPosts;
  },
});

export const listTags = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: tagListResponseValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { tags: [] };
    }

    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const tags = await ctx.db
      .query('tags')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    return {
      tags: tags
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((tag: any) => ({
          id: String(tag._id),
          name: tag.name,
          color: tag.color,
        })),
    };
  },
});

export const createTag = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    name: v.string(),
    color: v.string(),
  },
  returns: tagSummaryValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const trimmedName = args.name.trim();

    if (!trimmedName) {
      throw new Error('Tag name is required');
    }

    const existingTag = await ctx.db
      .query('tags')
      .withIndex('by_organization_id_and_name', (q: any) =>
        q.eq('organizationId', organizationId).eq('name', trimmedName)
      )
      .unique();

    if (existingTag && !existingTag.isDeleted) {
      return {
        id: String(existingTag._id),
        name: existingTag.name,
        color: existingTag.color,
      };
    }

    if (existingTag) {
      await ctx.db.patch(existingTag._id, {
        color: args.color,
        isDeleted: false,
        deletedAt: undefined,
      });

      return {
        id: String(existingTag._id),
        name: trimmedName,
        color: args.color,
      };
    }

    const tagId = await ctx.db.insert('tags', {
      organizationId,
      name: trimmedName,
      color: args.color,
      isDeleted: false,
      deletedAt: undefined,
      legacyTagId: undefined,
    });

    return {
      id: String(tagId),
      name: trimmedName,
      color: args.color,
    };
  },
});

export const updateTag = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    tagId: v.string(),
    name: v.string(),
    color: v.string(),
  },
  returns: tagSummaryValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const tag: any = await ctx.db.get(args.tagId as any);

    if (!tag || tag.organizationId !== organizationId || tag.isDeleted) {
      throw new Error('Tag not found');
    }

    const trimmedName = args.name.trim();

    if (!trimmedName) {
      throw new Error('Tag name is required');
    }

    await ctx.db.patch(tag._id, {
      name: trimmedName,
      color: args.color,
    });

    return {
      id: String(tag._id),
      name: trimmedName,
      color: args.color,
    };
  },
});

export const deleteTag = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    tagId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolvePostScope(
      ctx,
      identity.subject,
      args.organizationId
    );

    const tag: any = await ctx.db.get(args.tagId as any);

    if (!tag || tag.organizationId !== organizationId || tag.isDeleted) {
      return null;
    }

    await ctx.db.patch(tag._id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    const links = await ctx.db
      .query('postTags')
      .withIndex('by_tag_id_and_post_id', (q: any) => q.eq('tagId', tag._id))
      .collect();

    await Promise.all(links.map((row: any) => ctx.db.delete(row._id)));

    return null;
  },
});
