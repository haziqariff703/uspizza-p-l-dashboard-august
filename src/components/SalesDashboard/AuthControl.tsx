import React, { useEffect, useState } from 'react'
import { Eye, EyeClosed, LogIn, LogOut, Mail } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'

interface AuthControlProps { onSessionChange: () => void }
type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password'

export const AuthControl: React.FC<AuthControlProps> = ({ onSessionChange }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user.email ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password'); setIsOpen(true); setMessage('Choose a new password for your account.')
      }
      onSessionChange()
    })
    return () => listener.subscription.unsubscribe()
  }, [onSessionChange])

  const open = (nextMode: AuthMode) => {
    setMode(nextMode); setMessage(null); setPassword(''); setConfirmPassword(''); setShowPassword(false); setIsOpen(true)
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
        setIsOpen(false)
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
        setMode('sign-in'); setPassword(''); setConfirmPassword('')
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to continue. Please try again.')
    } finally { setIsSubmitting(false) }
  }

  const signOut = async () => { await getSupabaseClient().auth.signOut(); setIsOpen(false) }

  if (userEmail && mode !== 'reset-password') return <div className="flex items-center gap-2"><span className="hidden max-w-40 truncate text-xs font-semibold text-slate-600 sm:inline">{userEmail}</span><button type="button" onClick={() => void signOut()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>

  const title = mode === 'sign-up' ? 'Create your account' : mode === 'forgot-password' ? 'Reset password' : mode === 'reset-password' ? 'Set a new password' : 'Sign in'
  const submitLabel = mode === 'sign-up' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : mode === 'reset-password' ? 'Save new password' : 'Sign in'
  const needsEmail = mode !== 'reset-password'
  const needsPassword = mode !== 'forgot-password'
  const needsConfirmation = mode === 'sign-up' || mode === 'reset-password'

  return <div className="relative">
    <button type="button" onClick={() => open('sign-in')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><LogIn className="h-3.5 w-3.5" />Sign in</button>
    {isOpen && <form onSubmit={submit} className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{mode === 'sign-up' ? 'Create an account once. Future logins use your password.' : mode === 'forgot-password' ? 'We will email a one-time link to reset your password.' : 'Use your email address and password.'}</p>
      {needsEmail && <><label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="dashboard-email">Email address</label><div className="mt-1 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[#C8102E]"><Mail className="m-2.5 h-4 w-4 shrink-0 text-slate-400" /><input id="dashboard-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" autoComplete="email" className="min-w-0 flex-1 rounded-r-lg py-2 text-sm outline-none" /></div></>}
      {needsPassword && <><label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="dashboard-password">Password</label><PasswordInput id="dashboard-password" value={password} onChange={setPassword} visible={showPassword} onToggleVisibility={() => setShowPassword(visible => !visible)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></>}
      {needsConfirmation && <><label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="dashboard-confirm-password">Confirm password</label><PasswordInput id="dashboard-confirm-password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggleVisibility={() => setShowPassword(visible => !visible)} autoComplete="new-password" /></>}
      {message && <p role="status" className="mt-3 text-xs leading-5 text-slate-600">{message}</p>}
      <button type="submit" disabled={isSubmitting} className="mt-3 w-full rounded-lg bg-[#C8102E] px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Please wait…' : submitLabel}</button>
      {mode === 'sign-in' && <div className="mt-3 flex justify-between text-xs font-semibold"><button type="button" onClick={() => open('forgot-password')} className="text-slate-600 hover:text-[#C8102E]">Forgot password?</button><button type="button" onClick={() => open('sign-up')} className="text-[#C8102E] hover:underline">Create account</button></div>}
      {mode !== 'sign-in' && mode !== 'reset-password' && <button type="button" onClick={() => open('sign-in')} className="mt-3 text-xs font-semibold text-[#C8102E] hover:underline">Back to sign in</button>}
    </form>}
  </div>
}

const PasswordInput: React.FC<{ id: string; value: string; onChange: (value: string) => void; visible: boolean; onToggleVisibility: () => void; autoComplete: string }> = ({ id, value, onChange, visible, onToggleVisibility, autoComplete }) => <div className="relative mt-1">
  <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} required minLength={8} autoComplete={autoComplete} className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/15" />
  <button type="button" onClick={onToggleVisibility} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none">
    {visible ? <EyeClosed className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
  </button>
</div>
