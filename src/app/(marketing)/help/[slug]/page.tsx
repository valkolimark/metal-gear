'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getHelpArticle } from '@/app/actions/help'

export default function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getHelpArticle(slug)
      if ('error' in result) {
        toast.error('Article not found')
        router.push('/help')
        return
      }
      setArticle(result.article)
      setLoading(false)
    }
    load()
  }, [slug, router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/help')}
        className="font-body text-muted-foreground"
      >
        <ArrowLeft className="mr-1 size-3.5" />
        Back to Help Center
      </Button>

      <div>
        <Badge variant="outline" className="mb-3 font-body text-[11px] capitalize">
          {article.category.replace('_', ' ')}
        </Badge>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {article.title}
        </h1>
      </div>

      {/* Markdown content with dark theme styling */}
      <div className="prose-invert prose prose-sm max-w-none font-body [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_hr]:border-border [&_li]:text-muted-foreground [&_ol]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground [&_table]:border-border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border-border [&_th]:bg-surface [&_th]:px-3 [&_th]:py-2 [&_th]:text-foreground [&_ul]:text-muted-foreground">
        <ReactMarkdown>{article.body_markdown}</ReactMarkdown>
      </div>

      <div className="border-t border-border pt-6">
        <p className="font-body text-xs text-muted-foreground">
          Last updated{' '}
          {new Date(article.updated_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" size="sm" asChild className="font-body">
            <Link href="/help">Browse More Articles</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
