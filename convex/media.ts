import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    page: v.number(),
    limit: v.number(),
    search: v.optional(v.string()),
    kindFilter: v.optional(v.string()),
    tagFilter: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
  },
  returns: v.object({
    media: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        originalName: v.optional(v.string()),
        url: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        kind: v.string(),
        fileSize: v.number(),
        alt: v.optional(v.string()),
        createdAt: v.number(),
        mediaTags: v.optional(v.array(v.string())),
        checksum: v.optional(v.string()),
      })
    ),
    total: v.number(),
    page: v.number(),
    limit: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { media: [], total: 0, page: args.page, limit: args.limit, hasMore: false };
    }

    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const allMedia = await ctx.db
      .query('media')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    // Apply filters
    let filtered = allMedia;

    // Search filter (name, originalName, alt)
    if (args.search && args.search.trim()) {
      const term = args.search.trim().toLowerCase();
      filtered = filtered.filter(
        (item: any) =>
          item.name.toLowerCase().includes(term) ||
          (item.originalName && item.originalName.toLowerCase().includes(term)) ||
          (item.alt && item.alt.toLowerCase().includes(term))
      );
    }

    // Kind filter (image, video, file)
    if (args.kindFilter && args.kindFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.kind === args.kindFilter);
    }

    // Tag filter
    if (args.tagFilter && args.tagFilter.trim()) {
      const tagName = args.tagFilter.trim().toLowerCase();
      filtered = filtered.filter(
        (item: any) =>
          item.mediaTags &&
          item.mediaTags.some((t: string) => t.toLowerCase() === tagName)
      );
    }

    // Sorting
    const sortBy = args.sortBy || 'date';
    const sortOrder = args.sortOrder || 'desc';
    filtered.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        cmp = a.fileSize - b.fileSize;
      } else {
        // date (default)
        cmp = a._creationTime - b._creationTime;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const start = args.page * args.limit;
    const pageItems = filtered.slice(start, start + args.limit);

    const media = await Promise.all(
      pageItems.map(async (item: any) => {
        let resolvedUrl = item.url;

        if (!resolvedUrl && item.storageId) {
          resolvedUrl = await ctx.storage.getUrl(item.storageId);
        }

        return {
          id: String(item._id),
          name: item.name,
          originalName: item.originalName,
          url: resolvedUrl || undefined,
          thumbnailUrl: item.thumbnailUrl || resolvedUrl || undefined,
          kind: item.kind,
          fileSize: item.fileSize,
          alt: item.alt,
          createdAt: item._creationTime,
          mediaTags: item.mediaTags || undefined,
          checksum: item.checksum || undefined,
        };
      })
    );

    return {
      media,
      total: filtered.length,
      page: args.page,
      limit: args.limit,
      hasMore: start + args.limit < filtered.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Upload mutations
// ---------------------------------------------------------------------------

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const saveUploadedFile = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    storageId: v.id('_storage'),
    name: v.string(),
    originalName: v.optional(v.string()),
    kind: v.string(),
    fileSize: v.number(),
    alt: v.optional(v.string()),
    checksum: v.optional(v.string()),
  },
  returns: v.object({
    id: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { user, organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const mediaId = await ctx.db.insert('media', {
      organizationId,
      uploadedByUserId: user._id,
      storageId: args.storageId,
      name: args.name,
      originalName: args.originalName,
      path: undefined,
      url: undefined,
      fileSize: args.fileSize,
      kind: args.kind,
      thumbnailUrl: undefined,
      alt: args.alt,
      isDeleted: false,
      deletedAt: undefined,
      legacyMediaId: undefined,
      mediaTags: [],
      checksum: args.checksum,
    });

    return { id: String(mediaId) };
  },
});

// ---------------------------------------------------------------------------
// Metadata mutations
// ---------------------------------------------------------------------------

export const updateMetadata = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    mediaId: v.string(),
    name: v.optional(v.string()),
    alt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const media: any = await ctx.db.get(args.mediaId as any);

    if (!media || media.organizationId !== organizationId || media.isDeleted) {
      throw new Error('Media not found');
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    if (args.alt !== undefined) {
      updates.alt = args.alt.trim() || undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(media._id, updates);
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Tag management
// ---------------------------------------------------------------------------

export const updateMediaTags = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    mediaId: v.string(),
    mediaTags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const media: any = await ctx.db.get(args.mediaId as any);

    if (!media || media.organizationId !== organizationId || media.isDeleted) {
      throw new Error('Media not found');
    }

    await ctx.db.patch(media._id, { mediaTags: args.mediaTags });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Delete (single + bulk)
// ---------------------------------------------------------------------------

export const remove = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    mediaId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const media: any = await ctx.db.get(args.mediaId as any);

    if (!media || media.organizationId !== organizationId || media.isDeleted) {
      throw new Error('Media not found');
    }

    await ctx.db.patch(media._id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    return null;
  },
});

export const bulkRemove = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    mediaIds: v.array(v.string()),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    let deletedCount = 0;
    const now = Date.now();

    for (const mediaId of args.mediaIds) {
      const media: any = await ctx.db.get(mediaId as any);

      if (media && media.organizationId === organizationId && !media.isDeleted) {
        await ctx.db.patch(media._id, {
          isDeleted: true,
          deletedAt: now,
        });
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

export const checkDuplicate = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
    checksum: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    isDuplicate: v.boolean(),
    existingMedia: v.optional(
      v.object({
        id: v.string(),
        name: v.string(),
        kind: v.string(),
        createdAt: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { isDuplicate: false };
    }

    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    // Check by checksum first (most reliable)
    const allMedia = await ctx.db
      .query('media')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    const match = allMedia.find(
      (item: any) =>
        (item.checksum && item.checksum === args.checksum) ||
        (item.originalName === args.fileName && item.fileSize === args.fileSize)
    );

    if (match) {
      return {
        isDuplicate: true,
        existingMedia: {
          id: String(match._id),
          name: match.name,
          kind: match.kind,
          createdAt: match._creationTime,
        },
      };
    }

    return { isDuplicate: false };
  },
});

// ---------------------------------------------------------------------------
// Media tag CRUD
// ---------------------------------------------------------------------------

export const listMediaTags = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      color: v.string(),
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

    const tags = await ctx.db
      .query('mediaTags')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    return tags.map((tag: any) => ({
      id: String(tag._id),
      name: tag.name,
      color: tag.color,
    }));
  },
});

export const createMediaTag = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    name: v.string(),
    color: v.string(),
  },
  returns: v.object({
    id: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    // Check for duplicate tag name
    const existing = await ctx.db
      .query('mediaTags')
      .withIndex('by_organization_id_and_name', (q: any) =>
        q.eq('organizationId', organizationId).eq('name', args.name.trim())
      )
      .first();

    if (existing && !existing.isDeleted) {
      throw new Error('A tag with this name already exists');
    }

    // If soft-deleted, revive it
    if (existing && existing.isDeleted) {
      await ctx.db.patch(existing._id, {
        isDeleted: false,
        deletedAt: undefined,
        color: args.color,
      });
      return { id: String(existing._id) };
    }

    const tagId = await ctx.db.insert('mediaTags', {
      organizationId,
      name: args.name.trim(),
      color: args.color,
      isDeleted: false,
      deletedAt: undefined,
    });

    return { id: String(tagId) };
  },
});

export const deleteMediaTag = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    tagId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const tag: any = await ctx.db.get(args.tagId as any);

    if (!tag || tag.organizationId !== organizationId || tag.isDeleted) {
      throw new Error('Tag not found');
    }

    await ctx.db.patch(tag._id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Remove the tag from all media items that reference it
    const allMedia = await ctx.db
      .query('media')
      .withIndex('by_organization_id_and_is_deleted', (q: any) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    for (const item of allMedia) {
      if (item.mediaTags && item.mediaTags.includes(tag.name)) {
        await ctx.db.patch(item._id, {
          mediaTags: item.mediaTags.filter((t: string) => t !== tag.name),
        });
      }
    }

    return null;
  },
});
