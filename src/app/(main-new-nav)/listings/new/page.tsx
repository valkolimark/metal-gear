import { redirect } from "next/navigation"
import AdvancedListingForm from "./AdvancedListingForm"

export const dynamic = "force-dynamic"

/**
 * `/listings/new` is the default listing creation entry: the multi-step manual
 * form. `?mode=photo` redirects to the experimental Photo-to-Listing flow at
 * `/listings/snap`. `?mode=advanced` is a back-compat alias for the default.
 */
export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  if (mode === "photo") {
    redirect("/listings/snap")
  }
  return <AdvancedListingForm />
}
