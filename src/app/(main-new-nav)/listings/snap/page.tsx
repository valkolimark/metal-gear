import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkSnapListQuota } from "@/app/actions/snap-list-usage"
import { getActiveCompanyId } from "@/app/actions/company-context"
import { SnapUploadZone } from "@/components/listings/snap-list/SnapUploadZone"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Photo-to-Listing (experimental)",
  description:
    "Upload photos and we'll draft a listing you can review and edit.",
}

export default async function SnapListUploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/listings/snap")
  }

  const companyId = await getActiveCompanyId(user.id)
  const quota = await checkSnapListQuota(user.id, companyId)

  return <SnapUploadZone quota={quota} />
}
