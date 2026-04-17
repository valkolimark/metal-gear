import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkSnapListQuota } from "@/app/actions/snap-list-usage"
import { getActiveCompanyId } from "@/app/actions/company-context"
import { SnapUploadZone } from "@/components/listings/snap-list/SnapUploadZone"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Snap & List — AI-assisted listing",
  description:
    "Upload photos of your equipment and Metal Gear's AI will draft the listing for you.",
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
