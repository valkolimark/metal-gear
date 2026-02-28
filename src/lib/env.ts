import { z } from 'zod/v4'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').or(z.string().startsWith('rk_')),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_APP_URL: z.url(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues.map(
      (i) => `  - ${i.path.join('.')}: ${i.message}`
    )
    console.error(
      `\n❌ Missing or invalid environment variables:\n${missing.join('\n')}\n`
    )
    throw new Error('Invalid environment variables')
  }

  return result.data
}
