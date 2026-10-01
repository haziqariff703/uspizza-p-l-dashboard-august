import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from './supabase'

export type SessionStatus = 'loading' | 'ready'

/**
 * Single source of truth for the signed-in identity used to gate the app.
 *
 * `status` is `loading` until auth has been resolved at least once, then
 * `ready`. The app MUST render nothing (or a neutral splash) while loading so
 * a signed-out visitor never sees dashboard chrome.
 *
 * `userEmail` is the signed-in user's email (null once `ready` and signed out).
 * `sessionToken` bumps on every auth change so downstream caches can drop the
 * previous identity's figures.
 * `isRecovery` is true after a `PASSWORD_RECOVERY` event (a reset-link session)
 * so the app can show a full-page "set a new password" form before letting the
 * user in.
 *
 * Why onAuthStateChange is the source of truth: Supabase emits `INITIAL_SESSION`
 * (from the local session store) right after client init, then `SIGNED_IN`,
 * `SIGNED_OUT`, `TOKEN_REFRESHED`, etc. `getUser()` is a network call that can
 * resolve out of order with those events. We therefore only use `getUser()` as a
 * fallback for the case where no auth event has arrived yet, and never let a
 * late `getUser()` result overwrite a newer event result.
 */
export function useSessionEmail(onSessionChange?: () => void) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [sessionToken, setSessionToken] = useState(0)
  const [isRecovery, setIsRecovery] = useState(false)

  // True once onAuthStateChange has delivered an event (INITIAL_SESSION
  // included). A `getUser()` fallback that resolves afterwards is ignored.
  const hasAuthEvent = useRef(false)

  const notify = useCallback(() => {
    setSessionToken((token) => token + 1)
    onSessionChange?.()
  }, [onSessionChange])

  useEffect(() => {
    let supabase
    try {
      supabase = getSupabaseClient()
    } catch {
      // Supabase is not configured — treat as signed out, not "loading forever".
      setUserEmail(null)
      setStatus('ready')
      return
    }

    let cancelled = false

    // Fallback only: resolve identity from a network round-trip if no auth
    // event has been delivered yet (e.g. the event was missed). Never overwrite
    // a newer event result.
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled || hasAuthEvent.current) return
        setUserEmail(data.user?.email ?? null)
      })
      .catch(() => {
        if (cancelled || hasAuthEvent.current) return
        setUserEmail(null)
      })
      .finally(() => {
        if (cancelled || hasAuthEvent.current) return
        setStatus('ready')
      })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      hasAuthEvent.current = true
      setUserEmail(session?.user.email ?? null)
      setStatus('ready')
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      notify()
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [notify])

  return { userEmail, status, sessionToken, isRecovery, setIsRecovery }
}
