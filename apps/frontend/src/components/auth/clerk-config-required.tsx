'use client';

import Link from 'next/link';

type ClerkConfigRequiredProps = {
  mode: 'sign-in' | 'sign-up' | 'forgot' | 'activate';
};

const titleByMode: Record<ClerkConfigRequiredProps['mode'], string> = {
  'sign-in': 'Clerk Sign In Is Not Configured',
  'sign-up': 'Clerk Sign Up Is Not Configured',
  forgot: 'Clerk Password Reset Is Not Configured',
  activate: 'Clerk Verification Is Not Configured',
};

export function ClerkConfigRequired({ mode }: ClerkConfigRequiredProps) {
  return (
    <div className="flex flex-col flex-1 gap-[20px] text-white">
      <div>
        <h1 className="text-[40px] font-[500] -tracking-[0.8px]">
          {titleByMode[mode]}
        </h1>
        <p className="mt-[12px] text-[14px] text-[#A3A3A3]">
          This auth area is Clerk-only now. The frontend runtime does not have
          `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, so Clerk cannot mount here yet.
        </p>
      </div>
      <div className="text-[14px] text-[#A3A3A3]">
        Add the Clerk publishable key to the frontend process, then restart the
        frontend server and reload this page.
      </div>
      <div className="flex">
        <Link
          href="/"
          className="flex-1 rounded-[10px] h-[52px] bg-[#612BD3] hover:bg-[#6f3be0] text-white flex items-center justify-center"
        >
          Back To Site
        </Link>
      </div>
    </div>
  );
}
