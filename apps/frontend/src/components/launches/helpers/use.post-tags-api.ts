'use client';

import { useCallback } from 'react';
import { api } from '@gitroom/convex/_generated/api';
import { useAppViewer } from '@gitroom/frontend/components/layout/use-app-viewer';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useConvex, useMutation } from 'convex/react';

type TagSummary = {
  id: string;
  name: string;
  color: string;
};

export function usePostTagsApi() {
  const fetch = useFetch();
  const convex = useConvex();
  const { canUseConvex } = useAppViewer();
  const createTagMutation = useMutation(api.posts.createTag);
  const updateTagMutation = useMutation(api.posts.updateTag);
  const deleteTagMutation = useMutation(api.posts.deleteTag);

  const listTags = useCallback(async () => {
    if (canUseConvex) {
      return await convex.query(api.posts.listTags, {});
    }

    try {
      const response = await fetch('/posts/tags');

      if (response.ok) {
        return await response.json();
      }
    } catch {
      /** empty **/
    }

    return { tags: [] as Array<TagSummary> };
  }, [canUseConvex, convex, fetch]);

  const createTag = useCallback(
    async (name: string, color: string) => {
      if (canUseConvex) {
        return await createTagMutation({ name, color });
      }

      try {
        const response = await fetch('/posts/tags', {
          method: 'POST',
          body: JSON.stringify({ name, color }),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch {
        /** empty **/
      }

      throw new Error('Unable to create tag');
    },
    [canUseConvex, createTagMutation, fetch]
  );

  const updateTag = useCallback(
    async (id: string, name: string, color: string) => {
      if (canUseConvex) {
        return await updateTagMutation({
          tagId: id,
          name,
          color,
        });
      }

      try {
        const response = await fetch(`/posts/tags/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, color }),
        });

        if (response.ok) {
          return await response.json();
        }
      } catch {
        /** empty **/
      }

      throw new Error('Unable to update tag');
    },
    [canUseConvex, fetch, updateTagMutation]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      if (canUseConvex) {
        await deleteTagMutation({
          tagId: id,
        });
        return null;
      }

      try {
        const response = await fetch(`/posts/tags/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          return null;
        }
      } catch {
        /** empty **/
      }

      throw new Error('Unable to delete tag');
    },
    [canUseConvex, deleteTagMutation, fetch]
  );

  return {
    listTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
