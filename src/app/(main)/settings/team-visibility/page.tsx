import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMembershipsForVisibility } from '@/lib/profile/team'
import { TeamVisibilityList } from './TeamVisibilityList'

export const metadata = {
  title: 'Team visibility — Settings | Metal Gear',
  robots: { index: false, follow: false },
}

export default async function TeamVisibilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberships = await getMembershipsForVisibility(user.id)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="font-bold text-foreground">Team visibility</span>
        </div>
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Team visibility
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Control whether you appear on each company&apos;s public team list.
          You choose — admins cannot toggle this for you, only request it.
        </p>
      </header>

      <TeamVisibilityList initial={memberships} />
    </div>
  )
}
