import React, { useEffect, useState } from 'react'
import { LogIn, LogOut, Mail } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'

interface AuthControlProps {
  onSessionChange: () => void
}

export const AuthControl: React.FC<AuthControlProps> = ({ onSessionChange }) => {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
      onSessionChange()
    })
    return () => listener.subscription.unsubscribe()
  }, [onSessionChange])

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSending(true)
    setMessage(null)
    try {
      const { error } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setMessage('Magic link sent. Open the email and return to this dashboard.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send the magic link.')
    } finally {
      setIsSending(false)
    }
  }

  const signOut = async () => {
    await getSupabaseClient().auth.signOut()
    setIsOpen(false)
  }

  if (userEmail) return <div className="flex items-center gap-2"><span className="hidden max-w-40 truncate text-xs font-semibold text-slate-600 sm:inline">{userEmail}</span><button type="button" onClick={() => void signOut()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>

  return <div className="relative"><button type="button" onClick={() => setIsOpen((open) => !open)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><LogIn className="h-3.5 w-3.5" />Sign in</button>{isOpen && <form onSubmit={sendMagicLink} className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><p className="text-sm font-black text-slate-900">Sign in to import sales</p><p className="mt-1 text-xs leading-5 text-slate-600">We will email a one-time sign-in link.</p><label className="mt-3 block text-xs font-bold text-slate-700" htmlFor="dashboard-email">Email address</label><div className="mt-1 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[#C8102E]"><Mail className="m-2.5 h-4 w-4 shrink-0 text-slate-400" /><input id="dashboard-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" className="min-w-0 flex-1 rounded-r-lg py-2 text-sm outline-none" /></div>{message && <p className="mt-3 text-xs leading-5 text-slate-600">{message}</p>}<button type="submit" disabled={isSending} className="mt-3 w-full rounded-lg bg-[#C8102E] px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSending ? 'Sending…' : 'Email me a sign-in link'}</button></form>}</div>
}
