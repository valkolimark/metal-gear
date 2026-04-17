import { redirect } from "next/navigation"
import AdvancedListingForm from "./AdvancedListingForm"

export const dynamic = "force-dynamic"

/**
 * `/listings/new` is now the alias route. When hit without `?mode=advanced`,
 * we redirect to the new Snap & List flow. The multi-step form remains
 * accessible at `/listings/new?mode=advanced` for edge cases.
 */
export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  if (mode !== "advanced") {
    redirect("/listings/snap")
  }
  return <AdvancedListingForm />
}
