'use client';

import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { ReactNode } from 'react';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { CopilotKit } from '@copilotkit/react-core';
import { useAppViewer } from '@gitroom/frontend/components/layout/use-app-viewer';
export const PreviewWrapper = ({ children }: { children: ReactNode }) => {
  const { backendUrl } = useVariables();
  const { user } = useAppViewer();
  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <Toaster />
          {children}
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
