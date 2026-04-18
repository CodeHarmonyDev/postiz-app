import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSignIn } from '@clerk/react'
import { AUTH_COMPLETE_PATH, getSsoCallbackUrl } from '../../lib/auth'

type SignInStep = 'credentials' | 'second_factor'
type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp' | null

function FieldError({ error }: { error?: { message: string; longMessage?: string } | null }) {
  if (!error) return null
  return <span className="text-xs text-rose-300">{error.longMessage || error.message}</span>
}

function GlobalErrors({ errors }: { errors: Array<{ message: string; longMessage?: string }> | null }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {errors.map((e, i) => (
        <p key={i}>{e.longMessage || e.message}</p>
      ))}
    </div>
  )
}

export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<SignInStep>('credentials')
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy>(null)
  const [manualError, setManualError] = useState('')

  const loading = fetchStatus === 'fetching'

  async function handleMfaSetup() {
    if (!signIn) return

    const strategies = signIn.supportedSecondFactors?.map((f) => f.strategy) ?? []

    if (strategies.includes('email_code')) {
      const { error } = await signIn.mfa.sendEmailCode()
      if (error) {
        setManualError(error.longMessage || error.message)
        return
      }
      setSecondFactorStrategy('email_code')
      setStep('second_factor')
      return
    }

    if (strategies.includes('phone_code')) {
      const { error } = await signIn.mfa.sendPhoneCode()
      if (error) {
        setManualError(error.longMessage || error.message)
        return
      }
      setSecondFactorStrategy('phone_code')
      setStep('second_factor')
      return
    }

    if (strategies.includes('totp')) {
      setSecondFactorStrategy('totp')
      setStep('second_factor')
      return
    }

    setManualError('This account requires an authentication step that is not supported here yet.')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signIn) return

    setManualError('')

    // MFA verification step
    if (step === 'second_factor' && secondFactorStrategy) {
      let result: { error: { message: string; longMessage?: string } | null }

      if (secondFactorStrategy === 'email_code') {
        result = await signIn.mfa.verifyEmailCode({ code })
      } else if (secondFactorStrategy === 'phone_code') {
        result = await signIn.mfa.verifyPhoneCode({ code })
      } else {
        result = await signIn.mfa.verifyTOTP({ code })
      }

      if (result.error) return // errors.fields.code will be auto-populated

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize()
        if (finalizeError) {
          setManualError(finalizeError.longMessage || finalizeError.message)
          return
        }
        window.location.assign(AUTH_COMPLETE_PATH)
        return
      }

      setManualError('Could not complete verification. Please try again.')
      return
    }

    // First factor: password sign-in
    const { error } = await signIn.password({
      identifier: email,
      password,
    })
    if (error) return // errors.fields.* will be auto-populated

    if (signIn.status === 'needs_second_factor') {
      await handleMfaSetup()
      return
    }

    if (signIn.status === 'complete') {
      const { error: finalizeError } = await signIn.finalize()
      if (finalizeError) {
        setManualError(finalizeError.longMessage || finalizeError.message)
        return
      }
      window.location.assign(AUTH_COMPLETE_PATH)
      return
    }

    setManualError('Could not complete sign-in. Please try again.')
  }

  async function handleOauth(strategy: 'oauth_github' | 'oauth_google') {
    if (!signIn) return

    setManualError('')

    const { error } = await signIn.sso({
      strategy,
      redirectUrl: AUTH_COMPLETE_PATH,
      redirectCallbackUrl: getSsoCallbackUrl(),
    })

    if (error) {
      setManualError(error.longMessage || error.message)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Sign In</p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Welcome back to your workspace.</h2>
        <p className="text-sm leading-6 text-slate-300">
          Continue with GitHub or Google, or use your email and password.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleOauth('oauth_github')}
          disabled={loading}
          className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-400 disabled:opacity-60"
        >
          Continue with GitHub
        </button>
        <button
          type="button"
          onClick={() => handleOauth('oauth_google')}
          disabled={loading}
          className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-white transition hover:border-orange-400 disabled:opacity-60"
        >
          Continue with Google
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
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Email address</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
              <FieldError error={errors.fields.identifier} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
              <FieldError error={errors.fields.password} />
            </label>
          </>
        ) : (
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-200">
              {secondFactorStrategy === 'totp' ? 'Authenticator code' : 'Verification code'}
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="text"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            />
            <FieldError error={errors.fields.code} />
          </label>
        )}

        {manualError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {manualError}
          </div>
        ) : null}

        <GlobalErrors errors={errors.global} />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Working...' : step === 'second_factor' ? 'Verify code' : 'Sign in'}
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
