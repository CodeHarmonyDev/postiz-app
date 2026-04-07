'use client';

import Link from 'next/link';

export function ConvexSetupRequired({
  reason,
}: {
  reason: 'auth_not_ready' | 'viewer_not_synced';
}) {
  const message =
    reason === 'auth_not_ready'
      ? 'Clerk authentication is working, but Convex is not accepting the Clerk token yet.'
      : 'Clerk authentication is working, but the Convex viewer has not been created yet.';

  return (
    <div className="min-h-screen min-w-screen bg-[#0E0E0E] text-white flex items-center justify-center p-[24px]">
      <div className="max-w-[680px] w-full rounded-[16px] border border-white/10 bg-[#1A1919] p-[32px]">
        <h1 className="text-[32px] font-[600] leading-tight">
          Convex Setup Required
        </h1>
        <p className="mt-[12px] text-[15px] text-[#A3A3A3]">{message}</p>
        <div className="mt-[20px] text-[14px] text-[#CFCFCF] space-y-[10px]">
          <p>
            The frontend is now Clerk-only, but the signed-in app still depends
            on Convex for viewer and organization state.
          </p>
          <p>
            Make sure the Convex deployment is running and that Convex auth is
            configured for Clerk before opening the app shell.
          </p>
        </div>
        <div className="mt-[24px] flex gap-[12px]">
          <Link
            href="/auth"
            className="rounded-[10px] h-[48px] px-[20px] bg-[#612BD3] hover:bg-[#6f3be0] text-white flex items-center justify-center"
          >
            Back To Auth
          </Link>
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
