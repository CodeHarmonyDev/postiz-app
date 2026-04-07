'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { consumeReturnUrl, setClerkFormError } from './clerk-auth.utils';

type Inputs = {
  email: string;
  code: string;
  password: string;
  repeatPassword: string;
};

export function Forgot() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const form = useForm<Inputs>({
    defaultValues: {
      code: '',
      password: '',
      repeatPassword: '',
    },
  });
  const isLoaded = Boolean(signIn);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (!isLoaded || !signIn) {
      return;
    }

    setLoading(true);
    form.clearErrors();

    try {
      if (step === 'request') {
        const initResponse = await signIn.create({
          identifier: data.email,
        });
        if (initResponse.error) {
          setClerkFormError(
            form,
            initResponse.error,
            {
              identifier: 'email',
              emailAddress: 'email',
            },
            'email'
          );
          return;
        }

        const sendResponse = await signIn.resetPasswordEmailCode.sendCode();
        if (sendResponse.error) {
          setClerkFormError(
            form,
            sendResponse.error,
            {
              identifier: 'email',
              emailAddress: 'email',
            },
            'email'
          );
          return;
        }
        setResetEmail(data.email);
        setStep('verify');
        return;
      }

      if (data.password !== data.repeatPassword) {
        form.setError('repeatPassword', {
          type: 'manual',
          message: t('passwords_do_not_match', 'Passwords do not match'),
        });
        return;
      }

      const verifyResponse = await signIn.resetPasswordEmailCode.verifyCode({
        code: data.code,
      });
      if (verifyResponse.error) {
        setClerkFormError(form, verifyResponse.error, { code: 'code' }, 'code');
        return;
      }

      const resetResponse = await signIn.resetPasswordEmailCode.submitPassword({
        password: data.password,
      });
      if (resetResponse.error) {
        setClerkFormError(
          form,
          resetResponse.error,
          {
            password: 'password',
            code: 'code',
          },
          'password'
        );
        return;
      }

      if (signIn.status === 'complete' && signIn.createdSessionId) {
        await setActive({
          session: signIn.createdSessionId,
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
        return;
      }

      setStep('success');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded || !signIn) {
      return;
    }

    setLoading(true);
    form.clearErrors('code');

    try {
      const response = await signIn.resetPasswordEmailCode.sendCode();
      if (response.error) {
        setClerkFormError(form, response.error, { code: 'code' }, 'code');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h1 className="text-3xl font-bold text-start mb-4 cursor-pointer">
              {t('forgot_password_1', 'Forgot Password')}
            </h1>
          </div>
          {step === 'request' ? (
            <>
              <div className="space-y-4 text-textColor">
                <Input
                  label="Email"
                  translationKey="label_email"
                  {...form.register('email', { required: true })}
                  type="email"
                  placeholder={t('email_address', 'Email Address')}
                />
              </div>
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 !h-[52px] !rounded-[10px]"
                    loading={loading || !isLoaded}
                  >
                    {t(
                      'send_password_reset_email',
                      'Send Password Reset Email'
                    )}
                  </Button>
                </div>
                <p className="mt-4 text-sm">
                  <Link href="/auth/login" className="underline cursor-pointer">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : step === 'verify' ? (
            <>
              <div className="space-y-4 text-textColor">
                <div className="text-[14px] text-[#A3A3A3]">
                  {t(
                    'password_reset_email_sent',
                    'Enter the verification code that Clerk sent to your email.'
                  )}
                  {!!resetEmail && (
                    <>
                      <br />
                      <span className="text-white">{resetEmail}</span>
                    </>
                  )}
                </div>
                <Input
                  label="Verification Code"
                  translationKey="verification_code"
                  {...form.register('code', { required: true })}
                  type="text"
                  placeholder={t('verification_code', 'Verification Code')}
                />
                <Input
                  label="New Password"
                  translationKey="label_new_password"
                  {...form.register('password', { required: true })}
                  type="password"
                  placeholder={t('label_password', 'Password')}
                />
                <Input
                  label="Repeat Password"
                  translationKey="label_repeat_password"
                  {...form.register('repeatPassword', { required: true })}
                  type="password"
                  placeholder={t('label_repeat_password', 'Repeat Password')}
                />
              </div>
              <div className="text-center mt-6">
                <div className="w-full flex">
                  <Button
                    type="submit"
                    className="flex-1 !h-[52px] !rounded-[10px]"
                    loading={loading || !isLoaded}
                  >
                    {t('change_password', 'Change Password')}
                  </Button>
                </div>
                <button
                  type="button"
                  className="mt-4 text-sm underline cursor-pointer"
                  onClick={resendCode}
                >
                  {t('send_again', 'Send Again')}
                </button>
                <p className="mt-4 text-sm">
                  <Link href="/auth/login" className="underline cursor-pointer">
                    {t('go_back_to_login', 'Go back to login')}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-start mt-6">
                {t(
                  'password_has_been_reset',
                  'Your password has been reset. You can now sign in with your new password.'
                )}
              </div>
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="underline cursor-pointer">
                  {t('go_back_to_login', 'Go back to login')}
                </Link>
              </p>
            </>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
