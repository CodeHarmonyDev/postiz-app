'use client';

import { useCallback } from 'react';
import { api } from '@gitroom/convex/_generated/api';
import { Id } from '@gitroom/convex/_generated/dataModel';
import { useAppViewer } from '@gitroom/frontend/components/layout/use-app-viewer';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useConvex, useMutation } from 'convex/react';

export function usePostActionsApi() {
  const fetch = useFetch();
  const convex = useConvex();
  const { canUseConvex } = useAppViewer();
  const deleteGroupMutation = useMutation(api.posts.deleteGroup);
  const changeDateMutation = useMutation(api.posts.changeDate);

  const getGroup = useCallback(
    async (groupId: string) => {
      try {
        const response = await fetch(`/posts/group/${groupId}`);

        if (response.ok) {
          return await response.json();
        }
      } catch {
        /** empty **/
      }

      if (canUseConvex) {
        return await convex.query(api.posts.getGroup, {
          groupId,
        });
      }

      throw new Error('Unable to load post group');
    },
    [canUseConvex, convex, fetch]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        const response = await fetch(`/posts/${groupId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          return await response.json();
        }
      } catch {
        /** empty **/
      }

      if (canUseConvex) {
        return await deleteGroupMutation({
          groupId,
        });
      }

      throw new Error('Unable to delete post group');
    },
    [canUseConvex, deleteGroupMutation, fetch]
  );

  const changeDate = useCallback(
    async (postId: string, publishAt: number, action: 'schedule' | 'update') => {
      try {
        const response = await fetch(`/posts/${postId}/date`, {
          method: 'PUT',
          body: JSON.stringify({
            date: new Date(publishAt).toISOString().slice(0, 16) + ':00',
            action,
          }),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch {
        /** empty **/
      }

      if (canUseConvex) {
        return await changeDateMutation({
          postId: postId as Id<'posts'>,
          publishAt,
          action,
        });
      }

      throw new Error('Unable to update post date');
    },
    [canUseConvex, changeDateMutation, fetch]
  );

  return {
    getGroup,
    deleteGroup,
    changeDate,
  };
}
