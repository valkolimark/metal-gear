'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Handshake, Heart, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CompanyAvatar } from '@/components/company/CompanyAvatar'
import { removeTrustedVendor } from '@/app/actions/trusted-vendors'
import { toast } from 'sonner'
import type { TrustedVendor } from '@/app/actions/trusted-vendors'

const INITIAL_SHOW = 6

export function TrustedVendorsWidget({
  vendors: initialVendors,
  userId,
}: {
  vendors: TrustedVendor[]
  userId: string
}) {
  const [vendors, setVendors] = useState(initialVendors)
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? vendors : vendors.slice(0, INITIAL_SHOW)

  async function handleRemove(companyId: string) {
    // Optimistic removal
    const prev = vendors
    setVendors((v) => v.filter((vendor) => vendor.id !== companyId))

    const result = await removeTrustedVendor(userId, companyId)
    if (!result.success) {
      setVendors(prev)
      toast.error('Failed to remove vendor')
    }
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <Handshake className="size-5 text-primary" />
        <CardTitle className="flex-1 font-display text-lg">
          Trusted Vendors
        </CardTitle>
        {vendors.length > 0 && (
          <Badge variant="outline" className="font-body text-xs">
            {vendors.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {vendors.length === 0 ? (
          <div className="py-6 text-center">
            <Handshake className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-body text-sm font-medium text-foreground">
              Your trusted vendor rolodex is empty
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              Browse companies and click the heart to add them here
            </p>
            <Link
              href="/search"
              className="mt-3 inline-flex items-center gap-1.5 font-body text-sm text-primary hover:underline"
            >
              <Search className="size-3.5" />
              Browse Companies &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
              >
                <CompanyAvatar
                  name={vendor.name}
                  logoUrl={vendor.logo_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/companies/${vendor.slug}`}
                    className="block truncate font-body text-sm font-medium text-foreground hover:text-primary"
                  >
                    {vendor.name}
                  </Link>
                  <p className="truncate font-body text-xs text-muted-foreground">
                    {[vendor.industry, [vendor.city, vendor.state].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(vendor.id)}
                  className="shrink-0 rounded p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                  aria-label={`Remove ${vendor.name} from trusted vendors`}
                >
                  <Heart className="size-4 fill-red-500" />
                </button>
              </div>
            ))}

            {!showAll && vendors.length > INITIAL_SHOW && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full pt-2 text-center font-body text-xs text-primary hover:underline"
              >
                See all ({vendors.length}) &rarr;
              </button>
            )}
          </div>
        )}

        {vendors.length > 0 && (
          <p className="mt-4 text-center font-body text-[10px] text-muted-foreground">
            Add vendors by clicking the heart on any company page
          </p>
        )}
      </CardContent>
    </Card>
  )
}
