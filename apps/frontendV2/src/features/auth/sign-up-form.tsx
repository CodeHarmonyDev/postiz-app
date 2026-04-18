import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSignUp } from '@clerk/react'
import { AUTH_COMPLETE_PATH, getSsoCallbackUrl } from '../../lib/auth'

type SignUpStep = 'register' | 'verify'

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

export function SignUpForm({ registrationDisabled }: { registrationDisabled: boolean }) {
  const { signUp, errors, fetchStatus } = useSignUp()
  const [step, setStep] = useState<SignUpStep>('register')
  const [pendingEmail, setPendingEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [code, setCode] = useState('')
  const [manualError, setManualError] = useState('')

  const loading = fetchStatus === 'fetching'

  // Recover a pending verification from a previous attempt
  useEffect(() => {
    if (!signUp?.emailAddress) return
    if (
      signUp.status &&
      signUp.status !== 'complete' &&
      signUp.unverifiedFields.includes('email_address')
    ) {
      setPendingEmail(signUp.emailAddress)
      setStep('verify')
    }
  }, [signUp])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signUp || registrationDisabled) return

    setManualError('')

    if (step === 'verify') {
      const { error } = await signUp.verifications.verifyEmailCode({ code })
      if (error) return // errors.fields.code will be auto-populated

      if (signUp.status === 'complete') {
        const { error: finalizeError } = await signUp.finalize()
        if (finalizeError) {
          setManualError(finalizeError.longMessage || finalizeError.message)
          return
        }
        window.location.assign(AUTH_COMPLETE_PATH)
        return
      }

      setManualError('Your email is not verified yet. Please try the code again.')
      return
    }

    // Step 1: Sign up with email + password (+ company metadata if provided)
    const { error } = await signUp.password({
      emailAddress: email,
      password,
      ...(company ? { unsafeMetadata: { company } } : {}),
    })
    if (error) return // errors.fields.* will be auto-populated

    // If auto-completed (no verification needed)
    if (signUp.status === 'complete') {
      const { error: finalizeError } = await signUp.finalize()
      if (finalizeError) {
        setManualError(finalizeError.longMessage || finalizeError.message)
        return
      }
      window.location.assign(AUTH_COMPLETE_PATH)
      return
    }

    // Step 2: Send verification email
    const { error: sendError } = await signUp.verifications.sendEmailCode()
    if (sendError) {
      setManualError(sendError.longMessage || sendError.message)
      return
    }

    setPendingEmail(email)
    setStep('verify')
  }

  async function handleOauth(strategy: 'oauth_github' | 'oauth_google') {
    if (!signUp || registrationDisabled) return

    setManualError('')

    const { error } = await signUp.sso({
      strategy,
      redirectUrl: AUTH_COMPLETE_PATH,
      redirectCallbackUrl: getSsoCallbackUrl(),
    })

    if (error) {
      setManualError(error.longMessage || error.message)
    }
  }

  async function resendCode() {
    if (!signUp) return

    setManualError('')

    const { error } = await signUp.verifications.sendEmailCode()
    if (error) {
      setManualError(error.longMessage || error.message)
    }
  }

  if (registrationDisabled) {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Registration Paused</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white">New sign-ups are temporarily disabled.</h2>
          <p className="text-sm leading-6 text-slate-300">
            Existing members can still sign in while migration is underway.
          </p>
        </div>
        <Link
          to="/auth/login"
          search={{ returnTo: undefined }}
          className="inline-flex rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Create Account</p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Start with a clean workspace.</h2>
        <p className="text-sm leading-6 text-slate-300">
          Sign up, then Convex will provision your personal workspace automatically.
        </p>
      </div>

      {step === 'register' ? (
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
      ) : null}

      {step === 'register' ? (
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs uppercase tracking-[0.24em] text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {step === 'register' ? (
          <>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Email address</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
              <FieldError error={errors.fields.emailAddress} />
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
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Company or team name</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
            </label>
          </>
        ) : (
          <div className="space-y-3">
            <p className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              Enter the verification code sent to{' '}
              <span className="font-semibold text-white">{pendingEmail || email}</span>.
            </p>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Verification code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                type="text"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
              />
              <FieldError error={errors.fields.code} />
            </label>
          </div>
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
          {loading ? 'Working...' : step === 'verify' ? 'Verify email' : 'Create account'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
        {step === 'verify' ? (
          <button type="button" onClick={resendCode} className="transition hover:text-white">
            Send a new code
          </button>
        ) : (
          <span />
        )}
        <Link
          to="/auth/login"
          search={{ returnTo: undefined }}
          className="transition hover:text-white"
        >
          Already have an account?
        </Link>
      </div>
    </div>
  )
}
