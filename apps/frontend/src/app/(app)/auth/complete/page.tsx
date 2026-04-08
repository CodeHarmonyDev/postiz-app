'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { api } from '@gitroom/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import {
  consumeReturnUrl,
  readReturnUrl,
} from '@gitroom/frontend/components/auth/clerk-auth.utils';

type CompletionState =
  | 'loading'
  | 'convex_url_missing'
  | 'convex_auth_not_ready'
  | 'convex_sync_failed';

const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function AuthCompletePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncViewer = useMutation(api.users.syncViewer);
  const [state, setState] = useState<CompletionState>('loading');
  const [details, setDetails] = useState('');
  const hasAttemptedRef = useRef(false);
  const target = readReturnUrl() || '/launches';

  useEffect(() => {
    if (!isSignedIn) {
      router.replace('/auth/login');
      return;
    }

    if (!convexConfigured) {
      setState('convex_url_missing');
      return;
    }

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setState('convex_auth_not_ready');
      return;
    }

    if (hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;

    void syncViewer({})
      .then(() => {
        const destination = consumeReturnUrl();
        router.replace(destination);
        router.refresh();
      })
      .catch((error: unknown) => {
        hasAttemptedRef.current = false;
        setState('convex_sync_failed');
        setDetails(error instanceof Error ? error.message : String(error));
      });
  }, [isAuthenticated, isLoading, isSignedIn, router, syncViewer]);

  const retry = () => {
    hasAttemptedRef.current = false;
    setDetails('');
    setState('loading');
    router.refresh();
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col flex-1 justify-center gap-[16px] text-white">
        <div>
          <h1 className="text-[40px] font-[500] -tracking-[0.8px]">
            Finishing Sign In
          </h1>
          <p className="mt-[12px] text-[14px] text-[#A3A3A3]">
            We are syncing your Clerk session with the app workspace before
            sending you to <span className="text-white">{target}</span>.
          </p>
        </div>
        <div className="h-[8px] w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[35%] animate-pulse rounded-full bg-[#612BD3]" />
        </div>
      </div>
    );
  }

  const title =
    state === 'convex_url_missing'
      ? 'Convex URL Missing'
      : state === 'convex_auth_not_ready'
        ? 'Convex Auth Not Ready'
        : 'Convex Sync Failed';

  const message =
    state === 'convex_url_missing'
      ? 'Clerk auth completed, but the frontend runtime does not have NEXT_PUBLIC_CONVEX_URL, so the signed-in app cannot load.'
      : state === 'convex_auth_not_ready'
        ? 'Clerk auth completed, but Convex is not accepting the Clerk token yet. That usually means Convex auth has not been configured for Clerk.'
        : 'Clerk auth completed, but syncing the viewer record into Convex failed.';

  return (
    <div className="flex flex-col flex-1 gap-[20px] text-white">
      <div>
        <h1 className="text-[40px] font-[500] -tracking-[0.8px]">{title}</h1>
        <p className="mt-[12px] text-[14px] text-[#A3A3A3]">{message}</p>
      </div>
      {!!details && (
        <div className="rounded-[12px] border border-white/10 bg-black/20 p-[14px] text-[13px] text-[#D7D7D7]">
          {details}
        </div>
      )}
      <div className="text-[14px] text-[#A3A3A3]">
        Target after completion: <span className="text-white">{target}</span>
      </div>
      <div className="flex gap-[12px]">
        <button
          type="button"
          onClick={retry}
          className="rounded-[10px] h-[52px] px-[20px] bg-[#612BD3] hover:bg-[#6f3be0] text-white"
        >
          Retry
        </button>
        <Link
          href="/auth"
          className="rounded-[10px] h-[52px] px-[20px] border border-white/10 text-white flex items-center justify-center"
        >
          Back To Auth
        </Link>
      </div>
    </div>
  );
}
