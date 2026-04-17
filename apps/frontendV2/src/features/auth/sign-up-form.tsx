import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useClerk, useSignUp } from '@clerk/react'
import { AUTH_COMPLETE_PATH, AUTH_SSO_CALLBACK_PATH } from '../../lib/auth'
import { getClerkErrorMessage, getClerkFieldError } from '../../lib/clerk'

type SignUpStep = 'register' | 'verify'

type FormState = {
  email: string
  password: string
  company: string
  code: string
}

type FieldErrors = Partial<Record<keyof FormState | 'global', string>>

const defaultState: FormState = {
  email: '',
  password: '',
  company: '',
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

export function SignUpForm({ registrationDisabled }: { registrationDisabled: boolean }) {
  const { signUp, isLoaded } = useSignUp()
  const { setActive } = useClerk()
  const [form, setForm] = useState<FormState>(defaultState)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<SignUpStep>('register')
  const [pendingEmail, setPendingEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'oauth_github' | 'oauth_google' | null>(null)

  useEffect(() => {
    if (!signUp?.emailAddress) {
      return
    }

    if (
      signUp.status &&
      signUp.status !== 'complete' &&
      signUp.unverifiedFields.includes('email_address')
    ) {
      setPendingEmail(signUp.emailAddress)
      setStep('verify')
    }
  }, [signUp])

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function finishSession(sessionId: string | null) {
    if (!sessionId) {
      setErrors({
        global: 'We could not finish creating your account. Please try again.',
      })
      return
    }

    await setActive({ session: sessionId })
    window.location.assign(AUTH_COMPLETE_PATH)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!signUp || !isLoaded || registrationDisabled) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      if (step === 'verify') {
        const result = await signUp.attemptEmailAddressVerification({ code: form.code })

        if (result.status === 'complete') {
          await finishSession(result.createdSessionId)
          return
        }

        setErrors({
          code: 'Your email is not verified yet. Please try the code again.',
        })
        return
      }

      // Step 1: Create the sign-up with email + password
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      })

      // Step 2: Set company metadata if provided
      if (form.company) {
        await signUp.update({
          unsafeMetadata: { company: form.company },
        })
      }

      // Step 3: Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      setPendingEmail(form.email)
      setStep('verify')
    } catch (error) {
      const fieldError = getClerkFieldError(
        error,
        {
          email_address: 'email',
          emailAddress: 'email',
          password: 'password',
        },
        'global',
      )
      setErrors({ [fieldError.field]: fieldError.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleOauth(strategy: 'oauth_github' | 'oauth_google') {
    if (!signUp || !isLoaded || registrationDisabled) {
      return
    }

    setErrors({})
    setOauthLoading(strategy)

    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: AUTH_SSO_CALLBACK_PATH,
        redirectUrlComplete: AUTH_COMPLETE_PATH,
      })
    } catch (error) {
      setErrors({ global: getClerkErrorMessage(error) })
      setOauthLoading(null)
    }
  }

  async function resendCode() {
    if (!signUp || !isLoaded) {
      return
    }

    setLoading(true)
    setErrors((current) => ({ ...current, code: undefined, global: undefined }))

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
    } catch (error) {
      setErrors({ code: getClerkErrorMessage(error) })
    } finally {
      setLoading(false)
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
            <Field
              label="Company or team name"
              name="company"
              type="text"
              value={form.company}
              onChange={updateField}
              error={errors.company}
            />
          </>
        ) : (
          <div className="space-y-3">
            <p className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              Enter the verification code sent to{' '}
              <span className="font-semibold text-white">{pendingEmail || form.email}</span>.
            </p>
            <Field
              label="Verification code"
              name="code"
              type="text"
              value={form.code}
              onChange={updateField}
              error={errors.code}
            />
          </div>
        )}

        {errors.global ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errors.global}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !isLoaded}
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
