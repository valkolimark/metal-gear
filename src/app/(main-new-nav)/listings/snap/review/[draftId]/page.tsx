import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getDraft } from "@/app/actions/snap-list-draft"
import { ReviewDraft } from "@/components/listings/snap-list/ReviewDraft"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Review your listing",
  robots: { index: false, follow: false },
}

export default async function SnapReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const draft = await getDraft(draftId)
  if (!draft) notFound()

  if (draft.status === "analyzing") {
    redirect(`/listings/snap/analyzing/${draftId}`)
  }
  if (draft.status === "published" && draft.publishedListingId) {
    redirect(`/listings/${draft.publishedListingId}`)
  }

  return <ReviewDraft draft={draft} currentUserId={user.id} />
}
