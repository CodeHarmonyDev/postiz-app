import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  requireIdentity,
  requireMembership,
  requireUserByClerkId,
} from './lib/auth';
import {
  integrationDashboardItemValidator,
  integrationSummaryValidator,
  integrationTypeValidator,
} from './lib/validators';

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

export const listForCurrentOrganization = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(integrationSummaryValidator),
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
      .withIndex('by_organization_id_and_is_deleted', (q) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    return integrations.map((integration) => ({
      _id: integration._id,
      organizationId: integration.organizationId,
      customerId: integration.customerId,
      providerIdentifier: integration.providerIdentifier,
      type: integration.type,
      internalId: integration.internalId,
      rootInternalId: integration.rootInternalId,
      name: integration.name,
      pictureUrl: integration.pictureUrl,
      profile: integration.profile,
      disabled: integration.disabled,
      refreshNeeded: integration.refreshNeeded,
      inBetweenSteps: integration.inBetweenSteps,
      postingTimes: integration.postingTimes,
      additionalSettingsJson: integration.additionalSettingsJson,
      customInstanceDetails: integration.customInstanceDetails,
    }));
  },
});

export const listForDashboard = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  returns: v.array(integrationDashboardItemValidator),
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
      .withIndex('by_organization_id_and_is_deleted', (q) =>
        q.eq('organizationId', organizationId).eq('isDeleted', false)
      )
      .collect();

    return Promise.all(
      integrations.map(async (integration) => {
        const customer = integration.customerId
          ? await ctx.db.get(integration.customerId)
          : null;

        return {
          id: String(integration._id),
          name: integration.name,
          internalId: integration.internalId,
          disabled: integration.disabled,
          editor: 'normal' as const,
          picture: integration.pictureUrl || '/no-picture.jpg',
          identifier: integration.providerIdentifier,
          inBetweenSteps: integration.inBetweenSteps,
          refreshNeeded: integration.refreshNeeded,
          isCustomFields: false,
          display: integration.profile || '',
          type: integration.type,
          time: integration.postingTimes.map((time) => ({ time })),
          changeProfilePicture: false,
          changeNickName: false,
          additionalSettings: integration.additionalSettingsJson || '[]',
          customer:
            customer && !customer.isDeleted
              ? {
                  id: String(customer._id),
                  name: customer.name,
                }
              : undefined,
        };
      })
    );
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.optional(v.id('organizations')),
    customerId: v.optional(v.id('customers')),
    providerIdentifier: v.string(),
    type: integrationTypeValidator,
    internalId: v.string(),
    rootInternalId: v.optional(v.string()),
    name: v.string(),
    pictureUrl: v.optional(v.string()),
    profile: v.optional(v.string()),
    disabled: v.optional(v.boolean()),
    refreshNeeded: v.optional(v.boolean()),
    inBetweenSteps: v.optional(v.boolean()),
    postingTimes: v.optional(v.array(v.number())),
    additionalSettingsJson: v.optional(v.string()),
    customInstanceDetails: v.optional(v.string()),
    credentials: v.optional(
      v.object({
        accessToken: v.optional(v.string()),
        refreshToken: v.optional(v.string()),
        tokenType: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        scopes: v.optional(v.array(v.string())),
        lastRefreshError: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    integrationId: v.id('integrations'),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { organizationId } = await resolveOrganizationId(
      ctx,
      identity.subject,
      args.organizationId
    );

    const existing = await ctx.db
      .query('integrations')
      .withIndex('by_organization_id_and_internal_id', (q) =>
        q.eq('organizationId', organizationId).eq('internalId', args.internalId)
      )
      .unique();

    const integrationId =
      existing?._id ||
      (await ctx.db.insert('integrations', {
        organizationId,
        customerId: args.customerId,
        providerIdentifier: args.providerIdentifier,
        type: args.type,
        internalId: args.internalId,
        rootInternalId: args.rootInternalId,
        name: args.name,
        pictureUrl: args.pictureUrl,
        profile: args.profile,
        disabled: args.disabled ?? false,
        refreshNeeded: args.refreshNeeded ?? false,
        inBetweenSteps: args.inBetweenSteps ?? false,
        postingTimes: args.postingTimes || [120, 400, 700],
        additionalSettingsJson: args.additionalSettingsJson,
        customInstanceDetails: args.customInstanceDetails,
        isDeleted: false,
        deletedAt: undefined,
        legacyIntegrationId: undefined,
      }));

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerId: args.customerId,
        providerIdentifier: args.providerIdentifier,
        type: args.type,
        rootInternalId: args.rootInternalId,
        name: args.name,
        pictureUrl: args.pictureUrl,
        profile: args.profile,
        disabled: args.disabled ?? existing.disabled,
        refreshNeeded: args.refreshNeeded ?? existing.refreshNeeded,
        inBetweenSteps: args.inBetweenSteps ?? existing.inBetweenSteps,
        postingTimes: args.postingTimes || existing.postingTimes,
        additionalSettingsJson:
          args.additionalSettingsJson ?? existing.additionalSettingsJson,
        customInstanceDetails:
          args.customInstanceDetails ?? existing.customInstanceDetails,
        isDeleted: false,
        deletedAt: undefined,
      });
    }

    if (args.credentials) {
      const credential = await ctx.db
        .query('integrationCredentials')
        .withIndex('by_integration_id', (q) =>
          q.eq('integrationId', integrationId)
        )
        .unique();

      const payload = {
        integrationId,
        accessToken: args.credentials.accessToken,
        refreshToken: args.credentials.refreshToken,
        tokenType: args.credentials.tokenType,
        expiresAt: args.credentials.expiresAt,
        scopes: args.credentials.scopes || [],
        lastRefreshError: args.credentials.lastRefreshError,
      };

      if (credential) {
        await ctx.db.patch(credential._id, payload);
      } else {
        await ctx.db.insert('integrationCredentials', payload);
      }
    }

    return { integrationId };
  },
});
