import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getDraft } from "@/app/actions/snap-list-draft"
import { AnalysisStream } from "@/components/listings/snap-list/AnalysisStream"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Analyzing your equipment…",
  robots: { index: false, follow: false },
}

export default async function SnapAnalyzingPage({
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

  if (draft.status === "ready") {
    redirect(`/listings/snap/review/${draftId}`)
  }
  if (draft.status === "published" && draft.publishedListingId) {
    redirect(`/listings/${draft.publishedListingId}`)
  }

  return (
    <AnalysisStream
      draftId={draftId}
      initialStatus={draft.status}
      initialStage={draft.analysisStage}
      initialError={draft.errorMessage}
    />
  )
}
