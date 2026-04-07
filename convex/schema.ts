import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  announcementColorValidator,
  approvalStateValidator,
  billingPeriodValidator,
  integrationTypeValidator,
  postStateValidator,
  roleValidator,
  shortLinkPreferenceValidator,
  subscriptionTierValidator,
} from './lib/validators';

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
    bio: v.optional(v.string()),
    audience: v.number(),
    isSuperAdmin: v.boolean(),
    defaultOrganizationId: v.optional(v.id('organizations')),
    lastReadNotificationsAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    legacyUserId: v.optional(v.string()),
  })
    .index('by_clerk_user_id', ['clerkUserId'])
    .index('by_email', ['email'])
    .index('by_default_organization_id', ['defaultOrganizationId']),

  organizations: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    ownerUserId: v.id('users'),
    currentApiKeyId: v.optional(v.id('organizationApiKeys')),
    paymentId: v.optional(v.string()),
    streakSince: v.optional(v.number()),
    allowTrial: v.boolean(),
    isTrailing: v.boolean(),
    shortlinkPreference: shortLinkPreferenceValidator,
    legacyOrganizationId: v.optional(v.string()),
  })
    .index('by_slug', ['slug'])
    .index('by_owner_user_id', ['ownerUserId'])
    .index('by_current_api_key_id', ['currentApiKeyId']),

  organizationMemberships: defineTable({
    organizationId: v.id('organizations'),
    userId: v.id('users'),
    role: roleValidator,
    disabled: v.boolean(),
    invitedByUserId: v.optional(v.id('users')),
    legacyUserOrganizationId: v.optional(v.string()),
  })
    .index('by_user_id_and_organization_id', ['userId', 'organizationId'])
    .index('by_user_id_and_disabled', ['userId', 'disabled'])
    .index('by_organization_id_and_disabled', ['organizationId', 'disabled'])
    .index('by_organization_id_and_role', ['organizationId', 'role']),

  organizationApiKeys: defineTable({
    organizationId: v.id('organizations'),
    prefix: v.string(),
    secretHash: v.string(),
    description: v.optional(v.string()),
    scopes: v.array(v.string()),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    legacyApiKeyId: v.optional(v.string()),
  })
    .index('by_organization_id_and_revoked_at', ['organizationId', 'revokedAt'])
    .index('by_prefix', ['prefix']),

  subscriptions: defineTable({
    organizationId: v.id('organizations'),
    tier: subscriptionTierValidator,
    period: billingPeriodValidator,
    totalChannels: v.number(),
    isLifetime: v.boolean(),
    identifier: v.optional(v.string()),
    cancelAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  }).index('by_organization_id', ['organizationId']),

  customers: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyCustomerId: v.optional(v.string()),
  })
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_organization_id_and_name', ['organizationId', 'name']),

  media: defineTable({
    organizationId: v.id('organizations'),
    uploadedByUserId: v.optional(v.id('users')),
    storageId: v.optional(v.id('_storage')),
    name: v.string(),
    originalName: v.optional(v.string()),
    path: v.optional(v.string()),
    url: v.optional(v.string()),
    fileSize: v.number(),
    kind: v.string(),
    thumbnailUrl: v.optional(v.string()),
    alt: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyMediaId: v.optional(v.string()),
  })
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_uploaded_by_user_id', ['uploadedByUserId'])
    .index('by_storage_id', ['storageId']),

  integrations: defineTable({
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
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyIntegrationId: v.optional(v.string()),
  })
    .index('by_organization_id_and_internal_id', ['organizationId', 'internalId'])
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_organization_id_and_disabled', ['organizationId', 'disabled'])
    .index('by_organization_id_and_refresh_needed', [
      'organizationId',
      'refreshNeeded',
    ])
    .index('by_customer_id', ['customerId']),

  integrationCredentials: defineTable({
    integrationId: v.id('integrations'),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.array(v.string()),
    lastRefreshError: v.optional(v.string()),
  }).index('by_integration_id', ['integrationId']),

  tags: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    color: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyTagId: v.optional(v.string()),
  })
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_organization_id_and_name', ['organizationId', 'name']),

  postTags: defineTable({
    postId: v.id('posts'),
    tagId: v.id('tags'),
  })
    .index('by_post_id_and_tag_id', ['postId', 'tagId'])
    .index('by_tag_id_and_post_id', ['tagId', 'postId']),

  posts: defineTable({
    organizationId: v.id('organizations'),
    integrationId: v.id('integrations'),
    authorUserId: v.optional(v.id('users')),
    state: postStateValidator,
    publishAt: v.number(),
    content: v.string(),
    groupId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    parentPostId: v.optional(v.id('posts')),
    delayMinutes: v.optional(v.number()),
    releaseId: v.optional(v.string()),
    releaseUrl: v.optional(v.string()),
    settingsJson: v.optional(v.string()),
    imageJson: v.optional(v.string()),
    submittedForOrderId: v.optional(v.string()),
    submittedForOrganizationId: v.optional(v.id('organizations')),
    approvalState: approvalStateValidator,
    lastMessageId: v.optional(v.string()),
    repeatIntervalDays: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyPostId: v.optional(v.string()),
  })
    .index('by_organization_id_and_is_deleted_and_publish_at', [
      'organizationId',
      'isDeleted',
      'publishAt',
    ])
    .index('by_organization_id_and_state_and_publish_at', [
      'organizationId',
      'state',
      'publishAt',
    ])
    .index('by_organization_id_and_group_id', ['organizationId', 'groupId'])
    .index('by_integration_id_and_publish_at', ['integrationId', 'publishAt'])
    .index('by_parent_post_id', ['parentPostId']),

  comments: defineTable({
    organizationId: v.id('organizations'),
    postId: v.id('posts'),
    userId: v.id('users'),
    content: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyCommentId: v.optional(v.string()),
  })
    .index('by_post_id_and_is_deleted', ['postId', 'isDeleted'])
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_user_id_and_is_deleted', ['userId', 'isDeleted']),

  notifications: defineTable({
    organizationId: v.id('organizations'),
    content: v.string(),
    link: v.optional(v.string()),
    level: announcementColorValidator,
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyNotificationId: v.optional(v.string()),
  }).index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted']),

  signatures: defineTable({
    organizationId: v.id('organizations'),
    content: v.string(),
    autoAdd: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacySignatureId: v.optional(v.string()),
  }).index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted']),

  webhooks: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    url: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyWebhookId: v.optional(v.string()),
  }).index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted']),

  autoposts: defineTable({
    organizationId: v.id('organizations'),
    title: v.string(),
    content: v.optional(v.string()),
    onSlot: v.boolean(),
    syncLast: v.boolean(),
    url: v.string(),
    lastUrl: v.optional(v.string()),
    active: v.boolean(),
    addPicture: v.boolean(),
    generateContent: v.boolean(),
    integrationIds: v.array(v.id('integrations')),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyAutopostId: v.optional(v.string()),
  })
    .index('by_organization_id_and_is_deleted', ['organizationId', 'isDeleted'])
    .index('by_organization_id_and_active', ['organizationId', 'active']),

  oauthApps: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    clientId: v.string(),
    clientSecretHash: v.string(),
    redirectUris: v.array(v.string()),
    logoMediaId: v.optional(v.id('media')),
    scopes: v.array(v.string()),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    legacyOAuthAppId: v.optional(v.string()),
  })
    .index('by_organization_id_and_client_id', ['organizationId', 'clientId'])
    .index('by_organization_id', ['organizationId']),

  oauthAuthorizations: defineTable({
    oauthAppId: v.id('oauthApps'),
    organizationId: v.id('organizations'),
    userId: v.id('users'),
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    legacyOAuthAuthorizationId: v.optional(v.string()),
  })
    .index('by_oauth_app_id_and_user_id', ['oauthAppId', 'userId'])
    .index('by_organization_id_and_user_id', ['organizationId', 'userId'])
    .index('by_token_prefix', ['tokenPrefix']),

  announcements: defineTable({
    title: v.string(),
    description: v.string(),
    color: announcementColorValidator,
    isDeleted: v.boolean(),
  }).index('by_is_deleted', ['isDeleted']),
});
