import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useClerk, useSignIn } from '@clerk/react'
import { AUTH_COMPLETE_PATH } from '../../lib/auth'
import { getClerkErrorMessage, getClerkFieldError } from '../../lib/clerk'

type ResetStep = 'request' | 'verify' | 'success'

type FormState = {
  email: string
  code: string
  password: string
  repeatPassword: string
}

type FieldErrors = Partial<Record<keyof FormState | 'global', string>>

const defaultState: FormState = {
  email: '',
  code: '',
  password: '',
  repeatPassword: '',
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

export function ForgotPasswordForm() {
  const { signIn, isLoaded } = useSignIn()
  const { setActive } = useClerk()
  const [form, setForm] = useState<FormState>(defaultState)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<ResetStep>('request')
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!signIn || !isLoaded) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      if (step === 'request') {
        // Step 1: Create a sign-in with the identifier, then prepare reset_password_email_code
        await signIn.create({ identifier: form.email })
        await signIn.prepareFirstFactor({ strategy: 'reset_password_email_code' })

        setResetEmail(form.email)
        setStep('verify')
        return
      }

      if (step !== 'verify') {
        return
      }

      if (form.password !== form.repeatPassword) {
        setErrors({ repeatPassword: 'Passwords do not match.' })
        return
      }

      // Step 2: Verify the code
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: form.code,
      })

      if (result.status === 'needs_new_password') {
        // Step 3: Set the new password
        const resetResult = await signIn.resetPassword({
          password: form.password,
        })

        if (resetResult.status === 'complete' && resetResult.createdSessionId) {
          await setActive({ session: resetResult.createdSessionId })
          window.location.assign(AUTH_COMPLETE_PATH)
          return
        }
      }

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        window.location.assign(AUTH_COMPLETE_PATH)
        return
      }

      setStep('success')
    } catch (error) {
      if (step === 'request') {
        const fieldError = getClerkFieldError(
          error,
          {
            identifier: 'email',
            email_address: 'email',
            emailAddress: 'email',
          },
          'global',
        )
        setErrors({ [fieldError.field]: fieldError.message })
      } else {
        const fieldError = getClerkFieldError(
          error,
          {
            password: 'password',
            code: 'code',
          },
          'global',
        )
        setErrors({ [fieldError.field]: fieldError.message })
      }
    } finally {
      setLoading(false)
    }
  }

  async function resendCode() {
    if (!signIn || !isLoaded) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await signIn.prepareFirstFactor({ strategy: 'reset_password_email_code' })
    } catch (error) {
      setErrors({ code: getClerkErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Password Reset</p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Reset your password.</h2>
        <p className="text-sm leading-6 text-slate-300">
          Enter your email and we will send you a verification code to set a new password.
        </p>
      </div>

      {step === 'success' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            Your password has been updated. Sign in again if you were not automatically redirected.
          </div>
          <Link
            to="/auth/login"
            search={{ returnTo: undefined }}
            className="inline-flex rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {step === 'request' ? (
            <Field
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              error={errors.email}
            />
          ) : (
            <>
              <p className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                Enter the verification code sent to{' '}
                <span className="font-semibold text-white">{resetEmail}</span>.
              </p>
              <Field
                label="Verification code"
                name="code"
                type="text"
                value={form.code}
                onChange={updateField}
                error={errors.code}
              />
              <Field
                label="New password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                error={errors.password}
              />
              <Field
                label="Repeat password"
                name="repeatPassword"
                type="password"
                value={form.repeatPassword}
                onChange={updateField}
                error={errors.repeatPassword}
              />
            </>
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
            {loading ? 'Working...' : step === 'request' ? 'Send reset email' : 'Update password'}
          </button>
        </form>
      )}

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
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
