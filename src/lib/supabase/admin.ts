import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service role client — server-only, bypasses RLS
// NEVER expose this client or its key to the browser
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
