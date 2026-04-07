'use client';

import 'reflect-metadata';
import { FC, useCallback } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { usePostSlot } from '@gitroom/frontend/components/launches/helpers/use.post.slot';
export const StandaloneModal: FC = () => {
  const params = useParams<{ platform: string }>();
  const { isLoading, data: integrations } = useIntegrationList();
  const findNextSlot = usePostSlot();

  const loadDate = useCallback(async () => {
    if (params.platform === 'all') {
      return newDayjs().utc().format('YYYY-MM-DDTHH:mm:ss');
    }
    return await findNextSlot();
  }, [findNextSlot, params.platform]);
  const { isLoading: isLoading2, data } = useSWR('/posts/find-slot', loadDate, {
    fallbackData: '',
  });
  if (isLoading || isLoading2) {
    return null;
  }
  return (
    <AddEditModal
      dummy={params.platform === 'all'}
      customClose={() => {
        window.parent.postMessage(
          {
            action: 'closeIframe',
          },
          '*'
        );
      }}
      mutate={() => {}}
      integrations={integrations}
      reopenModal={() => {}}
      allIntegrations={integrations}
      date={dayjs.utc(data).local()}
    />
  );
};
