'use client';

import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { api } from '@gitroom/convex/_generated/api';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useMemo } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useMutation, useQuery } from 'convex/react';

type CommentsSource = 'convex' | 'legacy';

const CommentsList: FC<{
  comments: Array<{
    id: string;
    userId: string;
    content: string;
  }>;
  onSubmit: SubmitHandler<FieldValues>;
}> = ({ comments, onSubmit }) => {
  const { handleSubmit, register, setValue } = useForm();
  const t = useT();
  const submitAndReset = handleSubmit(async (values) => {
    await onSubmit(values);
    setValue('comment', '');
  });

  const mapUsers = useMemo(() => {
    return comments.reduce(
      (all: any, current: any) => {
        all.users[current.userId] = all.users[current.userId] || all.counter++;
        return all;
      },
      {
        users: {},
        counter: 1,
      }
    ).users;
  }, [comments]);

  return (
    <>
      <div className="mb-6 flex space-x-3">
        <form className="flex-1 space-y-2" onSubmit={submitAndReset}>
          <textarea
            {...register('comment', {
              required: true,
            })}
            className="flex w-full px-3 py-2 h-[98px] text-sm ring-offset-background placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none text-white bg-third border border-tableBorder placeholder-gray-500 focus:ring-0"
            placeholder="Add a comment..."
            defaultValue={''}
          />
          <div className="flex justify-end">
            <Button type="submit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-send me-2 h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              {t('post', 'Post')}
            </Button>
          </div>
        </form>
      </div>
      <div className="space-y-4">
        {!!comments.length && (
          <h3 className="text-lg font-semibold">{t('comments', 'Comments')}</h3>
        )}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex space-x-3 border-t border-tableBorder py-3"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold">
                  {t('user', 'User')}
                  {mapUsers[comment.userId]}
                </h3>
              </div>
              <p className="text-sm text-gray-300">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const LegacyComments: FC<{ postId: string }> = ({ postId }) => {
  const fetch = useFetch();
  const comments = useCallback(async () => {
    return (await fetch(`/public/posts/${postId}/comments`)).json();
  }, [fetch, postId]);
  const { data, mutate, isLoading } = useSWR(`comments-${postId}`, comments);

  const submit: SubmitHandler<FieldValues> = useCallback(
    async (values) => {
      await fetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      await mutate();
    },
    [fetch, mutate, postId]
  );

  if (isLoading) {
    return <></>;
  }

  return <CommentsList comments={data?.comments || []} onSubmit={submit} />;
};

const ConvexComments: FC<{ postId: string }> = ({ postId }) => {
  const commentsData = useQuery(api.posts.listPublicComments, {
    postId,
  });
  const createComment = useMutation(api.posts.createPublicComment);

  const submit: SubmitHandler<FieldValues> = useCallback(
    async (values) => {
      const comment = String(values.comment || '').trim();

      if (!comment) {
        return;
      }

      await createComment({
        postId,
        comment,
      });
    },
    [createComment, postId]
  );

  if (!commentsData) {
    return <></>;
  }

  return <CommentsList comments={commentsData.comments} onSubmit={submit} />;
};

export const CommentsComponents: FC<{
  postId: string;
  source: CommentsSource;
}> = ({ postId, source }) => {
  const user = useUser();
  const t = useT();

  const goToComments = useCallback(() => {
    window.location.href = `/auth?returnUrl=${window.location.href}`;
  }, []);

  if (!user?.id) {
    return (
      <Button onClick={goToComments}>
        {t(
          'login_register_to_add_comments',
          'Login / Register to add comments'
        )}
      </Button>
    );
  }

  if (source === 'convex') {
    return <ConvexComments postId={postId} />;
  }

  return <LegacyComments postId={postId} />;
};
