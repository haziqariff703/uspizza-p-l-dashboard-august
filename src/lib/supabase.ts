import { createClient } from '@supabase/supabase-js'

/**
 * Creates the browser client only when an action needs Supabase. This keeps the
 * dashboard usable while a developer is setting up local environment variables.
 */
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values to .env.local.')
  }

  return createClient(url, publishableKey)
}
