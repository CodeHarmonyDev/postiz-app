import { v } from 'convex/values';

export const roleValidator = v.union(
  v.literal('SUPERADMIN'),
  v.literal('ADMIN'),
  v.literal('USER')
);

export const subscriptionTierValidator = v.union(
  v.literal('FREE'),
  v.literal('STANDARD'),
  v.literal('PRO'),
  v.literal('TEAM'),
  v.literal('ULTIMATE')
);

export const billingPeriodValidator = v.union(
  v.literal('MONTHLY'),
  v.literal('YEARLY'),
  v.literal('LIFETIME')
);

export const shortLinkPreferenceValidator = v.union(
  v.literal('ASK'),
  v.literal('YES'),
  v.literal('NO')
);

export const announcementColorValidator = v.union(
  v.literal('INFO'),
  v.literal('WARNING'),
  v.literal('ERROR')
);

export const postStateValidator = v.union(
  v.literal('QUEUE'),
  v.literal('PUBLISHED'),
  v.literal('ERROR'),
  v.literal('DRAFT')
);

export const approvalStateValidator = v.union(
  v.literal('NO'),
  v.literal('WAITING_CONFIRMATION'),
  v.literal('YES')
);

export const integrationTypeValidator = v.union(
  v.literal('social'),
  v.literal('article')
);

export const userSummaryValidator = v.object({
  _id: v.id('users'),
  clerkUserId: v.string(),
  email: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  fullName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  timezone: v.optional(v.string()),
  language: v.optional(v.string()),
  isSuperAdmin: v.boolean(),
  defaultOrganizationId: v.optional(v.id('organizations')),
});

export const organizationSummaryValidator = v.object({
  _id: v.id('organizations'),
  name: v.string(),
  slug: v.optional(v.string()),
  description: v.optional(v.string()),
  ownerUserId: v.id('users'),
  shortlinkPreference: shortLinkPreferenceValidator,
  allowTrial: v.boolean(),
  isTrailing: v.boolean(),
  streakSince: v.optional(v.number()),
});

export const membershipSummaryValidator = v.object({
  _id: v.id('organizationMemberships'),
  organizationId: v.id('organizations'),
  userId: v.id('users'),
  role: roleValidator,
  disabled: v.boolean(),
});

export const viewerStateValidator = v.object({
  user: userSummaryValidator,
  organization: organizationSummaryValidator,
  membership: membershipSummaryValidator,
});

export const organizationListItemValidator = v.object({
  organization: organizationSummaryValidator,
  membership: membershipSummaryValidator,
  isDefault: v.boolean(),
});

export const integrationSummaryValidator = v.object({
  _id: v.id('integrations'),
  organizationId: v.id('organizations'),
  customerId: v.optional(v.id('customers')),
  providerIdentifier: v.string(),
  type: integrationTypeValidator,
  internalId: v.string(),
  rootInternalId: v.optional(v.string()),
  name: v.string(),
  pictureUrl: v.optional(v.string()),
  profile: v.optional(v.string()),
  disabled: v.boolean(),
  refreshNeeded: v.boolean(),
  inBetweenSteps: v.boolean(),
  postingTimes: v.array(v.number()),
  additionalSettingsJson: v.optional(v.string()),
  customInstanceDetails: v.optional(v.string()),
});

export const integrationDashboardItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  internalId: v.string(),
  disabled: v.boolean(),
  editor: v.union(
    v.literal('none'),
    v.literal('normal'),
    v.literal('markdown'),
    v.literal('html')
  ),
  picture: v.string(),
  identifier: v.string(),
  inBetweenSteps: v.boolean(),
  refreshNeeded: v.boolean(),
  isCustomFields: v.boolean(),
  display: v.string(),
  type: integrationTypeValidator,
  time: v.array(
    v.object({
      time: v.number(),
    })
  ),
  changeProfilePicture: v.boolean(),
  changeNickName: v.boolean(),
  additionalSettings: v.string(),
  customer: v.optional(
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
});

export const postCalendarIntegrationValidator = v.object({
  id: v.string(),
  providerIdentifier: v.string(),
  name: v.string(),
  picture: v.string(),
});

export const postCalendarTagInnerValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
});

export const postCalendarTagValidator = v.object({
  tag: postCalendarTagInnerValidator,
});

export const postCalendarItemValidator = v.object({
  id: v.string(),
  content: v.string(),
  publishDate: v.string(),
  releaseURL: v.optional(v.string()),
  releaseId: v.optional(v.string()),
  state: postStateValidator,
  group: v.string(),
  tags: v.array(postCalendarTagValidator),
  integration: postCalendarIntegrationValidator,
  intervalInDays: v.optional(v.number()),
  actualDate: v.optional(v.string()),
});

export const postCalendarResponseValidator = v.object({
  posts: v.array(postCalendarItemValidator),
});

export const postListResponseValidator = v.object({
  posts: v.array(postCalendarItemValidator),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  hasMore: v.boolean(),
});

export const postGroupItemValidator = v.object({
  id: v.string(),
  group: v.string(),
  content: v.string(),
  publishDate: v.string(),
  actualDate: v.optional(v.string()),
  releaseId: v.optional(v.string()),
  releaseURL: v.optional(v.string()),
  state: postStateValidator,
  delay: v.number(),
  image: v.array(v.any()),
  settings: v.optional(v.any()),
  tags: v.array(postCalendarTagValidator),
  integration: v.optional(
    v.object({
      id: v.string(),
      providerIdentifier: v.string(),
      name: v.string(),
      picture: v.string(),
    })
  ),
  parentPostId: v.optional(v.string()),
  intervalInDays: v.optional(v.number()),
});

export const postGroupResponseValidator = v.object({
  group: v.string(),
  posts: v.array(postGroupItemValidator),
  integrationPicture: v.optional(v.string()),
  integration: v.string(),
  settings: v.any(),
});

export const postSummaryValidator = v.object({
  _id: v.id('posts'),
  organizationId: v.id('organizations'),
  integrationId: v.id('integrations'),
  authorUserId: v.optional(v.id('users')),
  state: postStateValidator,
  publishAt: v.number(),
  content: v.string(),
  groupId: v.string(),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  delayMinutes: v.optional(v.number()),
  releaseId: v.optional(v.string()),
  releaseUrl: v.optional(v.string()),
  settingsJson: v.optional(v.string()),
  imageJson: v.optional(v.string()),
  repeatIntervalDays: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
});

export const postComposerMediaValidator = v.object({
  id: v.optional(v.string()),
  path: v.string(),
  alt: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  thumbnailTimestamp: v.optional(v.number()),
});

export const postComposerValueValidator = v.object({
  id: v.optional(v.string()),
  content: v.string(),
  delay: v.optional(v.number()),
  image: v.array(postComposerMediaValidator),
});

export const postComposerTagValidator = v.object({
  value: v.string(),
  label: v.string(),
});

export const postComposerPayloadValidator = v.object({
  type: v.union(
    v.literal('draft'),
    v.literal('schedule'),
    v.literal('now'),
    v.literal('update')
  ),
  shortLink: v.boolean(),
  inter: v.optional(v.number()),
  date: v.string(),
  tags: v.array(postComposerTagValidator),
  posts: v.array(
    v.object({
      integration: v.object({
        id: v.id('integrations'),
      }),
      value: v.array(postComposerValueValidator),
      group: v.optional(v.string()),
      settings: v.any(),
    })
  ),
});

export const postComposerResultValidator = v.object({
  postId: v.string(),
  integration: v.string(),
  groupId: v.string(),
});

export const tagSummaryValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
});

export const tagListResponseValidator = v.object({
  tags: v.array(tagSummaryValidator),
});
