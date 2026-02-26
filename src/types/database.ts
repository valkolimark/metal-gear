export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Regenerate with:
// npx supabase gen types typescript --project-id fkcyfpdkcrhjieauhchn > src/types/database.ts
// or:
// npx supabase gen types typescript --db-url "postgresql://postgres:PASSWORD@db.fkcyfpdkcrhjieauhchn.supabase.co:5432/postgres" > src/types/database.ts
