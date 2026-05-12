import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getRadarCounts,
  getRadarEquipment,
  getRadarPosts,
  getRadarVideos,
  getRadarLists,
} from '@/app/actions/radar'
import { RadarPageClient } from './RadarPageClient'

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab || 'equipment'

  // Fetch all tab data unconditionally — client-side tab switches
  // use router.push which may serve cached RSC payloads
  const [counts, equipment, posts, videos, lists] = await Promise.all([
    getRadarCounts(user.id),
    getRadarEquipment(user.id),
    getRadarPosts(user.id),
    getRadarVideos(user.id),
    getRadarLists(user.id),
  ])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          My Radar
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Equipment, posts, and videos you&rsquo;ve saved
        </p>
      </div>

      <RadarPageClient
        activeTab={activeTab}
        counts={counts}
        equipment={equipment}
        posts={posts}
        videos={videos}
        lists={lists}
        userId={user.id}
      />
    </div>
  )
}
