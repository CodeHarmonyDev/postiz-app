'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isConvexSetupIssue =
    error.message.includes('users:current') ||
    error.message.includes('No auth provider found matching the given token') ||
    error.message.includes('Did you forget to run `npx convex dev`');

  if (isConvexSetupIssue) {
    return (
      <div className="min-h-screen min-w-screen bg-[#0E0E0E] text-white flex items-center justify-center p-[24px]">
        <div className="max-w-[720px] w-full rounded-[16px] border border-white/10 bg-[#1A1919] p-[32px]">
          <h1 className="text-[32px] font-[600] leading-tight">
            Convex Is Not Ready Yet
          </h1>
          <p className="mt-[12px] text-[15px] text-[#A3A3A3]">
            Clerk auth completed, but the signed-in app cannot load because the
            Convex viewer/auth bridge is not deployed or not configured for
            Clerk yet.
          </p>
          <div className="mt-[20px] text-[14px] text-[#CFCFCF] space-y-[10px]">
            <p>
              Start or deploy Convex so the public functions exist, then make
              sure Convex auth is configured to trust your Clerk issuer.
            </p>
            <p>
              After that, reload this page and the app shell should continue
              normally.
            </p>
          </div>
          <div className="mt-[24px] flex gap-[12px]">
            <button
              type="button"
              onClick={reset}
              className="rounded-[10px] h-[48px] px-[20px] bg-[#612BD3] hover:bg-[#6f3be0] text-white"
            >
              Try Again
            </button>
            <Link
              href="/auth"
              className="rounded-[10px] h-[48px] px-[20px] border border-white/10 text-white flex items-center justify-center"
            >
              Back To Auth
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-[#0E0E0E] text-white flex items-center justify-center p-[24px]">
      <div className="max-w-[680px] w-full rounded-[16px] border border-white/10 bg-[#1A1919] p-[32px]">
        <h1 className="text-[32px] font-[600] leading-tight">
          Something Went Wrong
        </h1>
        <p className="mt-[12px] text-[15px] text-[#A3A3A3]">
          The app hit an unexpected error while loading this page.
        </p>
        <div className="mt-[24px] flex gap-[12px]">
          <button
            type="button"
            onClick={reset}
            className="rounded-[10px] h-[48px] px-[20px] bg-[#612BD3] hover:bg-[#6f3be0] text-white"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-[10px] h-[48px] px-[20px] border border-white/10 text-white flex items-center justify-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
