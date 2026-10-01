import React, { useEffect, useRef, useState } from 'react'
import { Eye, EyeClosed, Mail } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'

interface AuthFormProps {
  /** Optional starting mode. Defaults to 'sign-in'. */
  initialMode?: AuthMode
  /** Called after a successful sign-in (and after updateUser success). */
  onSuccess?: () => void
}

const HEADINGS: Record<AuthMode, { title: string; blurb: string; submit: string }> = {
  'sign-in': { title: 'Sign in', blurb: 'Use your work email address and password.', submit: 'Sign in' },
  'sign-up': { title: 'Create your account', blurb: 'Create an account once. Future logins use your password.', submit: 'Create account' },
  'forgot-password': { title: 'Reset password', blurb: 'We will email a one-time link to reset your password.', submit: 'Send reset link' },
  'reset-password': { title: 'Set a new password', blurb: 'Choose a new password for your account.', submit: 'Save new password' },
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'sign-in', onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Focus the first reachable field whenever the form appears or changes mode.
  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [mode])

  const switchTo = (nextMode: AuthMode) => {
    setMode(nextMode); setMessage(null); setPassword(''); setConfirmPassword(''); setShowPassword(false)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if ((mode === 'sign-up' || mode === 'reset-password') && password !== confirmPassword) {
      setMessage('Passwords do not match.'); return
    }
    setIsSubmitting(true); setMessage(null)
    try {
      const supabase = getSupabaseClient()
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onSuccess?.()
      } else if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        setMessage(data.session ? 'Account created and signed in.' : 'Account created. Confirm your email once, then sign in with your password.')
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setMessage('If that email has an account, we sent a password-reset link.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setMessage('Password updated. You can now sign in with it.')
        switchTo('sign-in')
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to continue. Please try again.')
    } finally { setIsSubmitting(false) }
  }

  const needsEmail = mode !== 'reset-password'
  const needsPassword = mode !== 'forgot-password'
  const needsConfirmation = mode === 'sign-up' || mode === 'reset-password'
  const copy = HEADINGS[mode]

  return (
    <form onSubmit={submit} className="w-full" aria-labelledby="auth-form-title">
      <p id="auth-form-title" className="text-sm font-black text-slate-900">{copy.title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{copy.blurb}</p>

      {needsEmail && (
        <>
          <label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="auth-email">Email address</label>
          <div className="mt-1 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[#C8102E]">
            <Mail className="m-2.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input ref={firstFieldRef} id="auth-email" type="email" value={email}
              onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com"
              autoComplete="email" className="min-w-0 flex-1 rounded-r-lg py-2 text-sm outline-none" />
          </div>
        </>
      )}

      {needsPassword && (
        <>
          <label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="auth-password">Password</label>
          <PasswordInput ref={!needsEmail ? firstFieldRef : undefined} id="auth-password" value={password}
            onChange={setPassword} visible={showPassword} onToggleVisibility={() => setShowPassword(v => !v)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
        </>
      )}

      {needsConfirmation && (
        <>
          <label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="auth-confirm-password">Confirm password</label>
          <PasswordInput id="auth-confirm-password" value={confirmPassword} onChange={setConfirmPassword}
            visible={showPassword} onToggleVisibility={() => setShowPassword(v => !v)} autoComplete="new-password" />
        </>
      )}

      {message && <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-slate-600">{message}</p>}

      <button type="submit" disabled={isSubmitting}
        className="mt-3 w-full rounded-lg bg-[#C8102E] px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#A60D26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] focus-visible:ring-offset-2">
        {isSubmitting ? 'Please wait…' : copy.submit}
      </button>

      {mode === 'sign-in' && (
        <div className="mt-3 flex justify-between text-xs font-semibold">
          <button type="button" onClick={() => switchTo('forgot-password')} className="text-slate-600 hover:text-[#C8102E]">Forgot password?</button>
          <button type="button" onClick={() => switchTo('sign-up')} className="text-[#C8102E] hover:underline">Create account</button>
        </div>
      )}
      {mode !== 'sign-in' && mode !== 'reset-password' && (
        <button type="button" onClick={() => switchTo('sign-in')} className="mt-3 text-xs font-semibold text-[#C8102E] hover:underline">Back to sign in</button>
      )}
    </form>
  )
}

const PasswordInput = React.forwardRef<HTMLInputElement, { id: string; value: string; onChange: (value: string) => void; visible: boolean; onToggleVisibility: () => void; autoComplete: string }>(
  ({ id, value, onChange, visible, onToggleVisibility, autoComplete }, ref) => (
    <div className="relative mt-1">
      <input ref={ref} id={id} type={visible ? 'text' : 'password'} value={value}
        onChange={(event) => onChange(event.target.value)} required minLength={8} autoComplete={autoComplete}
        className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/15" />
      <button type="button" onClick={onToggleVisibility} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none">
        {visible ? <EyeClosed className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  ),
)
PasswordInput.displayName = 'PasswordInput'
