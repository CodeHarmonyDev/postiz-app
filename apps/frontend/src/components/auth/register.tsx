'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useClerk, useSignUp } from '@clerk/nextjs';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  getAuthCompleteUrl,
  getAuthRedirectTarget,
  getSsoRedirectUrl,
  setClerkFormError,
} from './clerk-auth.utils';

type Inputs = {
  email: string;
  password: string;
  company: string;
  code: string;
};

export function Register({
  registrationDisabled,
}: {
  registrationDisabled?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const { isGeneral } = useVariables();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [pendingEmail, setPendingEmail] = useState('');
  const form = useForm<Inputs>({
    defaultValues: {
      code: '',
    },
  });
  const isLoaded = Boolean(signUp);

  useEffect(() => {
    if (!isLoaded || !signUp?.emailAddress) {
      return;
    }

    if (
      signUp.status &&
      signUp.status !== 'complete' &&
      signUp.unverifiedFields.includes('email_address')
    ) {
      setPendingEmail(signUp.emailAddress);
      setStep('verify');
    }
  }, [isLoaded, signUp]);

  const verificationLabel = useMemo(
    () => t('verification_code', 'Verification Code'),
    [t]
  );

  const finalizeSession = async (sessionId: string | null) => {
    if (!sessionId) {
      form.setError('code', {
        type: 'manual',
        message: t(
          'unable_to_finish_sign_up',
          'We could not finish creating your account. Please try again.'
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
        const url = decorateUrl(getAuthCompleteUrl());
        if (url.startsWith('http')) {
          window.location.href = url;
          return;
        }

        router.push(url);
        router.refresh();
      },
    });
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (!isLoaded || !signUp) {
      return;
    }

    setLoading(true);
    form.clearErrors();

    try {
      if (step === 'verify') {
        const response = await signUp.verifications.verifyEmailCode({
          code: data.code,
        });
        if (response.error) {
          setClerkFormError(form, response.error, { code: 'code' }, 'code');
          return;
        }

        if (signUp.status === 'complete') {
          await finalizeSession(signUp.createdSessionId);
          return;
        }

        form.setError('code', {
          type: 'manual',
          message: t(
            'email_verification_incomplete',
            'Your email is not verified yet. Please try the code again.'
          ),
        });
        return;
      }

      const response = await signUp.password({
        emailAddress: data.email,
        password: data.password,
      });
      if (response.error) {
        setClerkFormError(
          form,
          response.error,
          {
            emailAddress: 'email',
            password: 'password',
          },
          'email'
        );
        return;
      }

      if (data.company) {
        const metadataResponse = await signUp.update({
          unsafeMetadata: { company: data.company },
        });
        if (metadataResponse.error) {
          setClerkFormError(
            form,
            metadataResponse.error,
            { emailAddress: 'email' },
            'email'
          );
          return;
        }
      }

      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) {
        setClerkFormError(form, verification.error, { code: 'code' }, 'email');
        return;
      }
      setPendingEmail(data.email);
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    setLoading(true);
    form.clearErrors('code');

    try {
      const response = await signUp.verifications.sendEmailCode();
      if (response.error) {
        setClerkFormError(form, response.error, { code: 'code' }, 'code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOauth = async (strategy: 'oauth_github' | 'oauth_google') => {
    if (!isLoaded || !signUp) {
      return;
    }

    setOauthLoading(strategy);
    form.clearErrors();

    try {
      const response = await signUp.sso({
        strategy,
        redirectUrl: getAuthRedirectTarget(),
        redirectCallbackUrl: getSsoRedirectUrl(),
      });
      if (response.error) {
        setClerkFormError(form, response.error, { emailAddress: 'email' }, 'email');
        setOauthLoading(null);
      }
    } catch (error) {
      setClerkFormError(form, error, { emailAddress: 'email' }, 'email');
      setOauthLoading(null);
    }
  };

  if (registrationDisabled) {
    return (
      <div className="flex flex-col flex-1 gap-[20px]">
        <div>
          <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start">
            {t('sign_up', 'Sign Up')}
          </h1>
        </div>
        <p className="text-[14px] text-[#A3A3A3]">
          {t(
            'registration_disabled_message',
            'Registration is disabled right now. Existing members can still sign in.'
          )}
        </p>
        <Link href="/auth/login" className="underline cursor-pointer text-sm">
          {t('sign_in', 'Sign In')}
        </Link>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="flex-1 flex" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col flex-1">
          <div>
            <h1 className="text-[40px] font-[500] -tracking-[0.8px] text-start cursor-pointer">
              {t('sign_up', 'Sign Up')}
            </h1>
          </div>
          <div className="text-[14px] mt-[32px] mb-[12px]">
            {t('continue_with', 'Continue With')}
          </div>
          <div className="flex flex-col">
            {step === 'register' &&
              (!isGeneral ? (
                <Button
                  type="button"
                  className="rounded-[10px] !h-[52px] bg-white !text-[#0E0E0E]"
                  loading={oauthLoading === 'oauth_github'}
                  onClick={() => handleOauth('oauth_github')}
                >
                  {t('continue_with_github', 'Continue with GitHub')}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-[10px] !h-[52px] bg-white !text-[#0E0E0E]"
                  loading={oauthLoading === 'oauth_google'}
                  onClick={() => handleOauth('oauth_google')}
                >
                  {t('continue_with_google', 'Continue with Google')}
                </Button>
              ))}
            {step === 'register' && (
              <div className="h-[20px] mb-[24px] mt-[24px] relative">
                <div className="absolute w-full h-[1px] bg-fifth top-[50%] -translate-y-[50%]" />
                <div className="absolute z-[1] justify-center items-center w-full start-0 -top-[4px] flex">
                  <div className="px-[16px]">{t('or', 'or')}</div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-[12px]">
              <div className="text-textColor">
                {step === 'register' ? (
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
                    <Input
                      label="Company"
                      translationKey="label_company"
                      {...form.register('company')}
                      autoComplete="off"
                      type="text"
                      placeholder={t('label_company', 'Company')}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-[14px] text-[#A3A3A3] mb-[4px]">
                      {t(
                        'verification_code_sent',
                        'Enter the verification code that Clerk sent to your email.'
                      )}
                      {!!pendingEmail && (
                        <>
                          <br />
                          <span className="text-white">{pendingEmail}</span>
                        </>
                      )}
                    </div>
                    <Input
                      label={verificationLabel}
                      name="code"
                      {...form.register('code', { required: true })}
                      autoComplete="one-time-code"
                      type="text"
                      placeholder={verificationLabel}
                    />
                  </>
                )}
              </div>
              {step === 'register' && (
                <div className={clsx('text-[12px]')}>
                  {t(
                    'by_registering_you_agree_to_our',
                    'By registering you agree to our'
                  )}
                  &nbsp;
                  <a
                    href="https://postiz.com/terms"
                    className="underline hover:font-bold"
                    rel="nofollow"
                  >
                    {t('terms_of_service', 'Terms of Service')}
                  </a>
                  &nbsp;
                  {t('and', 'and')}&nbsp;
                  <a
                    href="https://postiz.com/privacy"
                    rel="nofollow"
                    className="underline hover:font-bold"
                  >
                    {t('privacy_policy', 'Privacy Policy')}
                  </a>
                  &nbsp;
                </div>
              )}
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[10px] !h-[52px]"
                    loading={loading || !isLoaded}
                  >
                    {step === 'verify'
                      ? t('verify_email', 'Verify Email')
                      : t('create_account', 'Create Account')}
                  </Button>
                </div>
                {step === 'register' && (
                  <div
                    id="clerk-captcha"
                    className="mt-4 flex min-h-[24px] items-center justify-center"
                  />
                )}
                {step === 'verify' && (
                  <button
                    type="button"
                    className="mt-4 text-sm underline cursor-pointer"
                    onClick={resendCode}
                  >
                    {t('send_again', 'Send Again')}
                  </button>
                )}
                <p className="mt-4 text-sm">
                  {t('already_have_an_account', 'Already Have An Account?')}
                  &nbsp;
                  <Link href="/auth/login" className="underline  cursor-pointer">
                    {t('sign_in', 'Sign In')}
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
