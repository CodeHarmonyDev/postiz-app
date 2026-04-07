'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  consumeReturnUrl,
  getAuthRedirectTarget,
  getSsoRedirectUrl,
  setClerkFormError,
} from './clerk-auth.utils';

type Inputs = {
  email: string;
  password: string;
  code: string;
};

export function Login() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const { isGeneral } = useVariables();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [mfaStrategy, setMfaStrategy] = useState<
    'email_code' | 'phone_code' | 'totp' | null
  >(null);
  const form = useForm<Inputs>({
    defaultValues: {
      code: '',
    },
  });
  const isLoaded = Boolean(signIn);

  const mfaLabel = useMemo(() => {
    if (mfaStrategy === 'totp') {
      return t('authenticator_code', 'Authenticator Code');
    }

    return t('verification_code', 'Verification Code');
  }, [mfaStrategy, t]);

  const finalizeSession = async (sessionId: string | null) => {
    if (!sessionId) {
      form.setError('email', {
        type: 'manual',
        message: t(
          'unable_to_finish_sign_in',
          'We could not finish signing you in. Please try again.'
        ),
      });
      return;
    }

    await setActive({
      session: sessionId,
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
  };

  const handleSignInState = async () => {
    if (!signIn) {
      return;
    }

    if (signIn.status === 'complete') {
      await finalizeSession(signIn.createdSessionId);
      return;
    }

    if (
      signIn.status === 'needs_second_factor' ||
      signIn.status === 'needs_client_trust'
    ) {
      const strategies =
        signIn.supportedSecondFactors?.map((factor) => factor.strategy) || [];

      if (strategies.includes('email_code')) {
        await signIn.mfa.sendEmailCode();
        setMfaStrategy('email_code');
        setStep('mfa');
        return;
      }

      if (strategies.includes('phone_code')) {
        await signIn.mfa.sendPhoneCode();
        setMfaStrategy('phone_code');
        setStep('mfa');
        return;
      }

      if (strategies.includes('totp')) {
        setMfaStrategy('totp');
        setStep('mfa');
        return;
      }
    }

    form.setError('email', {
      type: 'manual',
      message: t(
        'additional_authentication_required',
        'This account needs an authentication method that is not available on this page yet.'
      ),
    });
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (!isLoaded || !signIn) {
      return;
    }

    setLoading(true);
    form.clearErrors();

    try {
      if (step === 'mfa' && mfaStrategy) {
        if (mfaStrategy === 'email_code') {
          const response = await signIn.mfa.verifyEmailCode({
            code: data.code,
          });
          if (response.error) {
            setClerkFormError(form, response.error, { code: 'code' }, 'code');
            return;
          }
        } else if (mfaStrategy === 'phone_code') {
          const response = await signIn.mfa.verifyPhoneCode({
            code: data.code,
          });
          if (response.error) {
            setClerkFormError(form, response.error, { code: 'code' }, 'code');
            return;
          }
        } else {
          const response = await signIn.mfa.verifyTOTP({
            code: data.code,
          });
          if (response.error) {
            setClerkFormError(form, response.error, { code: 'code' }, 'code');
            return;
          }
        }
        await handleSignInState();
        return;
      }

      const response = await signIn.password({
        identifier: data.email,
        password: data.password,
      });
      if (response.error) {
        setClerkFormError(
          form,
          response.error,
          {
            identifier: 'email',
            emailAddress: 'email',
            password: 'password',
          },
          'email'
        );
        return;
      }
      await handleSignInState();
    } finally {
      setLoading(false);
    }
  };

  const handleOauth = async (strategy: 'oauth_github' | 'oauth_google') => {
    if (!isLoaded || !signIn) {
      return;
    }

    setOauthLoading(strategy);
    form.clearErrors();

    try {
      const response = await signIn.sso({
        strategy,
        redirectUrl: getAuthRedirectTarget(),
        redirectCallbackUrl: getSsoRedirectUrl(),
      });
      if (response.error) {
        setClerkFormError(
          form,
          response.error,
          {
            identifier: 'email',
            emailAddress: 'email',
          },
          'email'
        );
        setOauthLoading(null);
      }
    } catch (error) {
      setClerkFormError(form, error, { identifier: 'email' }, 'email');
      setOauthLoading(null);
    }
  };

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start cursor-pointer">
              {t('sign_in', 'Sign In')}
            </h1>
          </div>
          <div className="text-[14px] mt-[32px] mb-[12px]">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {!isGeneral ? (
              <Button
                type="button"
                className="rounded-[10px] !h-[52px] bg-white !text-[#0E0E0E]"
                loading={oauthLoading === 'oauth_github'}
                onClick={() => handleOauth('oauth_github')}
              >
                {t('sign_in_with_github', 'Sign in with GitHub')}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-[10px] !h-[52px] bg-white !text-[#0E0E0E]"
                loading={oauthLoading === 'oauth_google'}
                onClick={() => handleOauth('oauth_google')}
              >
                {t('sign_in_with_google', 'Sign in with Google')}
              </Button>
            )}
            <div className="h-[20px] mb-[24px] mt-[24px] relative">
              <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]" />
              <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
                <div className="px-[16px]">{t('or', 'or')}</div>
              </div>
            </div>
            <div className="flex flex-col gap-[12px]">
              <div className="text-textColor">
                {step === 'credentials' ? (
                  <>
                    <Input
                      label="Email"
                      translationKey="label_email"
                      {...form.register('email', { required: true })}
                      type="email"
                      placeholder={t('email_address', 'Email Address')}
                    />
                    <Input
                      label="Password"
                      translationKey="label_password"
                      {...form.register('password', { required: true })}
                      autoComplete="off"
                      type="password"
                      placeholder={t('label_password', 'Password')}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-[14px] text-[#A3A3A3] mb-[4px]">
                      {mfaStrategy === 'totp'
                        ? t(
                            'enter_code_from_authenticator',
                            'Enter the code from your authenticator app to finish signing in.'
                          )
                        : mfaStrategy === 'phone_code'
                          ? t(
                              'enter_code_from_phone',
                              'Enter the verification code that Clerk sent to your phone.'
                            )
                        : t(
                            'enter_code_from_email',
                            'Enter the verification code that Clerk sent to your email.'
                          )}
                    </div>
                    <Input
                      label={mfaLabel}
                      name="code"
                      {...form.register('code', { required: true })}
                      type="text"
                      placeholder={mfaLabel}
                    />
                  </>
                )}
              </div>
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[10px] !h-[52px]"
                    loading={loading || !isLoaded}
                  >
                    {step === 'mfa'
                      ? t('verify_code', 'Verify Code')
                      : t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link href="/auth" className="underline cursor-pointer">
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-4 text-sm">
                  <Link
                    href="/auth/forgot"
                    className="underline hover:font-bold cursor-pointer"
                  >
                    {t('forgot_password', 'Forgot password')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
