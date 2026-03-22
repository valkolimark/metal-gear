'use client'

import { RightSOSWidget } from './RightSOSWidget'
import { RightDiscoveryWidget } from './RightDiscoveryWidget'

interface SOSAlert {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  company_id: string | null
  company_name: string | null
}

interface DiscoveryListing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean | null
  location_city: string | null
  location_state: string | null
  listing_images: Array<{ url: string; position: number }> | null
}

interface FeedRightSidebarProps {
  sosAlerts: SOSAlert[]
  discoveryListings: DiscoveryListing[]
  className?: string
}

export function FeedRightSidebar({
  sosAlerts,
  discoveryListings,
  className = '',
}: FeedRightSidebarProps) {
  return (
    <aside className={`w-[340px] shrink-0 sticky top-4 h-fit flex flex-col gap-4 ${className}`}>
      <RightSOSWidget sosAlerts={sosAlerts} />
      <RightDiscoveryWidget listings={discoveryListings} />
    </aside>
  )
}
