import { redirect } from 'next/navigation'
import { type Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getHashtagPosts } from '@/app/actions/feed-posts'
import { HashtagFeedClient } from './HashtagFeedClient'

interface Props {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return {
    title: `#${tag} — Metal Gear Feed`,
    description: `Posts tagged with #${tag} on Metal Gear industrial equipment marketplace`,
    openGraph: {
      title: `#${tag} on Metal Gear`,
      description: `Browse industrial equipment posts tagged #${tag}`,
    },
  }
}

export default async function HashtagPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tag: rawTag } = await params
  const tag = rawTag.toLowerCase()

  const { posts, nextCursor, totalCount } = await getHashtagPosts({
    tag,
    limit: 10,
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <HashtagFeedClient
        tag={tag}
        initialPosts={posts}
        initialNextCursor={nextCursor}
        totalCount={totalCount}
        currentUserId={user.id}
      />
    </div>
  )
}
