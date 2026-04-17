import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useClerk, useSignIn } from '@clerk/react'
import { AUTH_COMPLETE_PATH, getSsoCallbackUrl, readReturnTo } from '../../lib/auth'
import { getClerkErrorMessage, getClerkFieldError } from '../../lib/clerk'

type SignInStep = 'credentials' | 'mfa'
type MfaStrategy = 'email_code' | 'phone_code' | 'totp' | null

type FormState = {
  email: string
  password: string
  code: string
}

type FieldErrors = Partial<Record<keyof FormState | 'global', string>>

const defaultState: FormState = {
  email: '',
  password: '',
  code: '',
}

function Field({
  label,
  name,
  value,
  type,
  onChange,
  error,
}: {
  label: string
  name: keyof FormState
  value: string
  type: string
  onChange: (name: keyof FormState, value: string) => void
  error?: string
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        type={type}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
      />
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  )
}

export function SignInForm() {
  const { signIn } = useSignIn()
  const { setActive } = useClerk()
  const [form, setForm] = useState<FormState>(defaultState)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<SignInStep>('credentials')
  const [mfaStrategy, setMfaStrategy] = useState<MfaStrategy>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'oauth_github' | 'oauth_google' | null>(null)

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function finishSession(sessionId: string | null) {
    if (!sessionId) {
      setErrors({
        global: 'We could not finish signing you in. Please try again.',
      })
      return
    }

    await setActive({
      session: sessionId,
      navigate: async ({ decorateUrl }) => {
        window.location.assign(decorateUrl(AUTH_COMPLETE_PATH))
      },
    })
  }

  async function handleSignInState() {
    if (!signIn) {
      return
    }

    if (signIn.status === 'complete') {
      await finishSession(signIn.createdSessionId)
      return
    }

    if (
      signIn.status === 'needs_second_factor' ||
      signIn.status === 'needs_client_trust'
    ) {
      const strategies = signIn.supportedSecondFactors?.map((factor) => factor.strategy) || []

      if (strategies.includes('email_code')) {
        await signIn.mfa.sendEmailCode()
        setMfaStrategy('email_code')
        setStep('mfa')
        return
      }

      if (strategies.includes('phone_code')) {
        await signIn.mfa.sendPhoneCode()
        setMfaStrategy('phone_code')
        setStep('mfa')
        return
      }

      if (strategies.includes('totp')) {
        setMfaStrategy('totp')
        setStep('mfa')
        return
      }
    }

    setErrors({
      global: 'This account requires an authentication step that is not available in this screen yet.',
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!signIn) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      if (step === 'mfa' && mfaStrategy) {
        if (mfaStrategy === 'email_code') {
          const response = await signIn.mfa.verifyEmailCode({ code: form.code })
          if (response.error) {
            setErrors({ code: getClerkErrorMessage(response.error) })
            return
          }
        } else if (mfaStrategy === 'phone_code') {
          const response = await signIn.mfa.verifyPhoneCode({ code: form.code })
          if (response.error) {
            setErrors({ code: getClerkErrorMessage(response.error) })
            return
          }
        } else {
          const response = await signIn.mfa.verifyTOTP({ code: form.code })
          if (response.error) {
            setErrors({ code: getClerkErrorMessage(response.error) })
            return
          }
        }

        await handleSignInState()
        return
      }

      const response = await signIn.password({
        identifier: form.email,
        password: form.password,
      })

      if (response.error) {
        const fieldError = getClerkFieldError(
          response.error,
          {
            identifier: 'email',
            emailAddress: 'email',
            password: 'password',
          },
          'global',
        )
        setErrors({ [fieldError.field]: fieldError.message })
        return
      }

      await handleSignInState()
    } finally {
      setLoading(false)
    }
  }

  async function handleOauth(strategy: 'oauth_github' | 'oauth_google') {
    if (!signIn) {
      return
    }

    setErrors({})
    setOauthLoading(strategy)

    try {
      const response = await signIn.sso({
        strategy,
        redirectUrl: readReturnTo(),
        redirectCallbackUrl: getSsoCallbackUrl(),
      })

      if (response.error) {
        setErrors({ global: getClerkErrorMessage(response.error) })
        setOauthLoading(null)
      }
    } catch (error) {
      setErrors({ global: getClerkErrorMessage(error) })
      setOauthLoading(null)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Sign In</p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Welcome back to your publishing workspace.</h2>
        <p className="text-sm leading-6 text-slate-300">
          Continue with GitHub or Google, or use your email and password if you already have a Postiz account.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleOauth('oauth_github')}
          disabled={loading || oauthLoading !== null}
          className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-400 disabled:opacity-60"
        >
          {oauthLoading === 'oauth_github' ? 'Connecting GitHub...' : 'Continue with GitHub'}
        </button>
        <button
          type="button"
          onClick={() => handleOauth('oauth_google')}
          disabled={loading || oauthLoading !== null}
          className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-white transition hover:border-orange-400 disabled:opacity-60"
        >
          {oauthLoading === 'oauth_google' ? 'Connecting Google...' : 'Continue with Google'}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {step === 'credentials' ? (
          <>
            <Field
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              error={errors.email}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              error={errors.password}
            />
          </>
        ) : (
          <Field
            label={mfaStrategy === 'totp' ? 'Authenticator code' : 'Verification code'}
            name="code"
            type="text"
            value={form.code}
            onChange={updateField}
            error={errors.code}
          />
        )}

        {errors.global ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errors.global}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !signIn}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Working...' : step === 'mfa' ? 'Verify code' : 'Sign in'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        <Link
          to="/auth/forgot"
          search={{ returnTo: undefined }}
          className="transition hover:text-white"
        >
          Forgot your password?
        </Link>
        <Link to="/auth" search={{ returnTo: undefined }} className="transition hover:text-white">
          Need an account?
        </Link>
      </div>
    </div>
  )
}
