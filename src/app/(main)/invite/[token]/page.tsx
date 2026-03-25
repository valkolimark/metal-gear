import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { InviteAcceptClient } from './invite-accept-client'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  // Look up the invite to show company name before accepting
  const { data: invite } = await admin
    .from('company_invites')
    .select('id, email, role, status, expires_at, company_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Invite Not Found</h1>
          <p className="text-muted-foreground">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Invite Expired</h1>
          <p className="text-muted-foreground">Ask the company owner to send a new invite.</p>
        </div>
      </div>
    )
  }

  // Get company info
  const { data: company } = await admin
    .from('company_profiles')
    .select('name, logo_url')
    .eq('id', invite.company_id)
    .single()

  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — redirect to signup with return URL
  if (!user) {
    redirect(`/signup?redirect=/invite/${token}&email=${encodeURIComponent(invite.email)}`)
  }

  return (
    <InviteAcceptClient
      token={token}
      userId={user.id}
      companyName={company?.name ?? 'a company'}
      companyLogo={company?.logo_url ?? undefined}
      role={invite.role}
      email={invite.email}
    />
  )
}
