'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useClerk, useSignUp } from '@clerk/nextjs';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { consumeReturnUrl, setClerkFormError } from './clerk-auth.utils';

type VerificationInputs = {
  code: string;
};

export function Activate() {
  const t = useT();
  const router = useRouter();
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const form = useForm<VerificationInputs>();
  const isLoaded = Boolean(signUp);
  const canVerify = Boolean(
    isLoaded &&
      signUp?.emailAddress &&
      signUp.status !== 'complete' &&
      signUp.unverifiedFields.includes('email_address')
  );

  const onSubmit: SubmitHandler<VerificationInputs> = async (data) => {
    if (!isLoaded || !signUp) {
      return;
    }

    setLoading(true);

    try {
      const response = await signUp.verifications.verifyEmailCode({
        code: data.code,
      });
      if (response.error) {
        setClerkFormError(form, response.error, { code: 'code' }, 'code');
        return;
      }

      if (signUp.status === 'complete' && signUp.createdSessionId) {
        await setActive({
          session: signUp.createdSessionId,
          navigate: async ({
            decorateUrl,
          }: {
            decorateUrl: (url: string) => string;
          }) => {
            const url = decorateUrl(consumeReturnUrl());
            if (url.startsWith('http')) {
              window.location.href = url;
              return;
            }

            router.push(url);
            router.refresh();
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    setLoading(true);
    form.clearErrors();

    try {
      const response = await signUp.verifications.sendEmailCode();
      if (response.error) {
        setClerkFormError(form, response.error, { code: 'code' }, 'code');
        return;
      }
      setStatus('sent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div>
        <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
          {t('activate_your_account', 'Activate your account')}
        </h1>
      </div>
      <div className="text-textColor">
        {t('thank_you_for_registering', 'Thank you for registering!')}
        <br />
        {t(
          'please_check_your_email_to_activate_your_account',
          'Please check your email to activate your account.'
        )}
      </div>

      <div className="mt-8 border-t border-fifth pt-6">
        <h2 className="text-lg font-semibold mb-4">
          {t('didnt_receive_email', "Didn't receive the email?")}
        </h2>
        {!canVerify ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-textColor">
              {t(
                'no_pending_signup_to_verify',
                'There is no pending Clerk sign-up to verify right now. Start from the sign-up page to create a new account.'
              )}
            </div>
            <Link href="/auth">
              <Button className="rounded-[10px] !h-[52px] w-full">
                {t('go_to_sign_up', 'Go to Sign Up')}
              </Button>
            </Link>
          </div>
        ) : (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="text-sm text-textColor">
                {t(
                  'verification_email_address',
                  'Verifying email address'
                )}
                : <span className="text-white">{signUp?.emailAddress}</span>
              </div>
              <Input
                label={t('verification_code', 'Verification Code')}
                translationKey="verification_code"
                {...form.register('code', { required: true })}
                type="text"
                placeholder={t('verification_code', 'Verification Code')}
              />
              <Button
                type="submit"
                className="rounded-[10px] !h-[52px]"
                loading={loading || !isLoaded}
              >
                {t('verify_email', 'Verify Email')}
              </Button>
              <button
                type="button"
                className="text-sm underline cursor-pointer"
                onClick={resendCode}
              >
                {t('resend_activation_email', 'Resend Activation Email')}
              </button>
              {status === 'sent' && (
                <div className="text-green-400 text-sm">
                  {t(
                    'activation_email_sent',
                    'A fresh verification code has been sent.'
                  )}
                </div>
              )}
            </form>
          </FormProvider>
        )}
        {canVerify && (
          <p className="mt-4 text-sm text-textColor">
            {t('already_activated', 'Already activated?')}&nbsp;
            <Link href="/auth/login" className="underline cursor-pointer">
              {t('sign_in', 'Sign In')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
