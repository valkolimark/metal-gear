import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ importId: string }> }
) {
  const { importId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('listing_imports')
    .select(
      'id, status, total_rows, processed_rows, successful_rows, failed_rows, image_fetch_attempted, image_fetch_succeeded, image_fetch_failed, error_log'
    )
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Import not found' }, { status: 404 })
  }

  return Response.json(data)
}
