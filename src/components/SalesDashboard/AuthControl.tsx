import React, { useState } from 'react'
import { LogIn, LogOut } from 'iconoir-react'
import { getSupabaseClient } from '../../lib/supabase'
import { useSessionEmail } from '../../lib/useSessionEmail'
import { AuthForm } from './AuthForm'

interface AuthControlProps { onSessionChange: () => void }

export const AuthControl: React.FC<AuthControlProps> = ({ onSessionChange }) => {
  const { userEmail } = useSessionEmail(onSessionChange)
  const [isOpen, setIsOpen] = useState(false)

  const signOut = async () => { await getSupabaseClient().auth.signOut(); setIsOpen(false) }

  if (userEmail) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-40 truncate text-xs font-semibold text-slate-600 sm:inline">{userEmail}</span>
        <button type="button" onClick={() => void signOut()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <LogOut className="h-3.5 w-3.5" />Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <LogIn className="h-3.5 w-3.5" />Sign in
      </button>
      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <AuthForm onSuccess={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  )
}
