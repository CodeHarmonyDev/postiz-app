import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSignIn } from '@clerk/react'
import { AUTH_COMPLETE_PATH } from '../../lib/auth'

type ResetStep = 'request' | 'verify' | 'success'

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

export function ForgotPasswordForm() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [step, setStep] = useState<ResetStep>('request')
  const [resetEmail, setResetEmail] = useState('')
  const [manualError, setManualError] = useState('')

  const loading = fetchStatus === 'fetching'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signIn) return

    setManualError('')

    if (step === 'request') {
      // Step 1: Create a sign-in with the identifier
      const { error: createError } = await signIn.create({ identifier: email })
      if (createError) return // errors.fields.identifier will be auto-populated

      // Step 2: Send the reset password email code
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode()
      if (sendError) {
        setManualError(sendError.longMessage || sendError.message)
        return
      }

      setResetEmail(email)
      setStep('verify')
      return
    }

    if (step !== 'verify') return

    if (password !== repeatPassword) {
      setManualError('Passwords do not match.')
      return
    }

    // Step 3: Verify the code
    const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code })
    if (verifyError) return // errors.fields.code will be auto-populated

    if (signIn.status !== 'needs_new_password') {
      // If status jumped to complete (unlikely but handle it)
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize()
        if (finalizeError) {
          setManualError(finalizeError.longMessage || finalizeError.message)
          return
        }
        window.location.assign(AUTH_COMPLETE_PATH)
        return
      }
      setManualError('Unexpected state. Please try again.')
      return
    }

    // Step 4: Submit the new password
    const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password })
    if (submitError) {
      setManualError(submitError.longMessage || submitError.message)
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

    setStep('success')
  }

  async function resendCode() {
    if (!signIn) return

    setManualError('')

    const { error } = await signIn.resetPasswordEmailCode.sendCode()
    if (error) {
      setManualError(error.longMessage || error.message)
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
          ) : (
            <>
              <p className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                Enter the verification code sent to{' '}
                <span className="font-semibold text-white">{resetEmail}</span>.
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
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">New password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
                />
                <FieldError error={errors.fields.password} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Repeat password</span>
                <input
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-sky-400"
                />
              </label>
            </>
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
