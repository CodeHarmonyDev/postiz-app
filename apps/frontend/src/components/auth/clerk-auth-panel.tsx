'use client';

import Link from 'next/link';
import { SignIn, SignUp } from '@clerk/nextjs';

type ClerkAuthPanelProps = {
  mode: 'sign-in' | 'sign-up' | 'forgot' | 'activate';
  registrationDisabled?: boolean;
};

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

function authAppearance() {
  return {
    elements: {
      card: 'bg-transparent shadow-none border-0 p-0',
      rootBox: 'w-full',
      headerTitle: 'text-white text-[40px] font-[500] -tracking-[0.8px]',
      headerSubtitle: 'text-[#A3A3A3]',
      socialButtonsBlockButton:
        'bg-[#2A2929] border border-white/10 hover:bg-[#343333] text-white',
      formButtonPrimary:
        'bg-[#612BD3] hover:bg-[#6f3be0] text-white rounded-[10px] h-[52px]',
      formFieldInput:
        'bg-[#111111] border border-white/10 text-white rounded-[10px] h-[52px]',
      footerActionLink: 'text-white underline',
      formFieldLabel: 'text-white',
      identityPreviewText: 'text-white',
      alertText: 'text-white',
      formResendCodeLink: 'text-white underline',
    },
  };
}

export function ClerkAuthPanel({
  mode,
  registrationDisabled,
}: ClerkAuthPanelProps) {
  if (!clerkEnabled) {
    return null;
  }

  if (mode === 'forgot') {
    return (
      <div className="flex flex-col gap-[20px] text-white">
        <div>
          <h1 className="text-[40px] font-[500] -tracking-[0.8px]">
            Reset Password
          </h1>
          <p className="mt-[12px] text-[14px] text-[#A3A3A3]">
            Use the Clerk sign-in flow to reset your password securely.
          </p>
        </div>
        <div className="flex">
          <Link
            href="/auth/login"
            className="flex-1 rounded-[10px] h-[52px] bg-[#612BD3] hover:bg-[#6f3be0] text-white flex items-center justify-center"
          >
            Open Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'activate') {
    return (
      <div className="flex flex-col gap-[20px] text-white">
        <div>
          <h1 className="text-[40px] font-[500] -tracking-[0.8px]">
            Verify Your Email
          </h1>
          <p className="mt-[12px] text-[14px] text-[#A3A3A3]">
            Clerk handles email verification inside the sign-up flow. Continue
            from the verification email, then sign in here if you need to come
            back manually.
          </p>
        </div>
        <div className="flex">
          <Link
            href="/auth/login"
            className="flex-1 rounded-[10px] h-[52px] bg-[#612BD3] hover:bg-[#6f3be0] text-white flex items-center justify-center"
          >
            Go To Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'sign-up' && registrationDisabled) {
    return (
      <div className="flex flex-col gap-[20px] text-white">
        <div>
          <h1 className="text-[40px] font-[500] -tracking-[0.8px]">
            Sign In
          </h1>
          <p className="mt-[12px] text-[14px] text-[#A3A3A3]">
            Registration is disabled right now. Existing members can continue
            with Clerk sign in.
          </p>
        </div>
        <div className="flex">
          <Link
            href="/auth/login"
            className="flex-1 rounded-[10px] h-[52px] bg-[#612BD3] hover:bg-[#6f3be0] text-white flex items-center justify-center"
          >
            Continue To Login
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'sign-up') {
    return (
      <SignUp
        path="/auth"
        routing="path"
        signInUrl="/auth/login"
        appearance={authAppearance()}
      />
    );
  }

  return (
    <SignIn
      path="/auth/login"
      routing="path"
      signUpUrl="/auth"
      appearance={authAppearance()}
    />
  );
}
