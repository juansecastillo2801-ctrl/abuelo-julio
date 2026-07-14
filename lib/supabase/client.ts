import { createBrowserClient } from '@supabase/ssr'

// Fallbacks prevent @supabase/ssr from throwing during SSR/prerender when
// NEXT_PUBLIC_* vars aren't in the build environment. Real values are baked
// into the client bundle by Next.js when the vars are set.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}
