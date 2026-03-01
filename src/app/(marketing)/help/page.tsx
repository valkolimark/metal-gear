'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Loader2,
  BookOpen,
  ShoppingCart,
  Tag,
  CreditCard,
  Truck,
  User,
  Shield,
  ChevronDown,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getHelpArticles,
  searchHelpArticles,
  submitSupportRequest,
} from '@/app/actions/help'

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  getting_started: BookOpen,
  buying: ShoppingCart,
  selling: Tag,
  payments: CreditCard,
  shipping: Truck,
  account: User,
  safety: Shield,
}

const FAQ = [
  {
    q: 'How do I create a listing?',
    a: 'Click "Create Listing" in the header, fill in your equipment details, upload photos, and publish. See the "How to Sell Equipment" article for detailed guidance.',
  },
  {
    q: 'How does escrow payment work?',
    a: 'When a buyer pays, funds are authorized but not captured. The seller ships the item, the buyer confirms delivery, and then funds are released to the seller. This protects both parties.',
  },
  {
    q: 'What is the platform fee?',
    a: 'Metal Gear charges a 5% platform fee on each transaction. This is deducted from the payment before funds are released to the seller.',
  },
  {
    q: 'How do I open a dispute?',
    a: 'Go to your Transactions page, select the transaction, and click "Open a Dispute". Select a reason, describe the issue, and upload evidence photos.',
  },
  {
    q: 'Can I cancel a transaction?',
    a: 'Yes, you can cancel a transaction before the seller ships the item. After shipping, you would need to open a dispute if there is a problem.',
  },
  {
    q: 'How do condition reports work?',
    a: 'Sellers can create detailed condition reports for their equipment with grades (A-F) and scores (1-10) for mechanical, cosmetic, and electrical condition. Verified sellers get a "Verified Inspection" badge.',
  },
  {
    q: 'What subscription plans are available?',
    a: 'We offer Free (3 listings), Premium ($29.99/mo, 15 listings), and Boost ($79.99/mo, 50 listings) plans. Each tier unlocks more features and higher limits.',
  },
  {
    q: 'How do I schedule an equipment viewing?',
    a: 'If a seller has set their availability, you\'ll see a "Request Viewing" button on their listing page. Pick a date and time, and the seller will confirm your appointment.',
  },
]

export default function HelpPage() {
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [articles, setArticles] = useState<any[]>([])
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  // Contact form
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSubject, setContactSubject] = useState('')
  const [contactCategory, setContactCategory] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadArticles = useCallback(async () => {
    const result = await getHelpArticles()
    setArticles(result.articles)
    setCategories(result.categories)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadArticles()
  }, [loadArticles])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const result = await searchHelpArticles(searchQuery.trim())
    setSearchResults(result.articles)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactName || !contactEmail || !contactSubject || !contactCategory || !contactMessage) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    const result = await submitSupportRequest({
      name: contactName,
      email: contactEmail,
      subject: contactSubject,
      category: contactCategory,
      message: contactMessage,
    })
    if ('success' in result) {
      toast.success('Support request sent! We\'ll get back to you soon.')
      setContactName('')
      setContactEmail('')
      setContactSubject('')
      setContactCategory('')
      setContactMessage('')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group articles by category
  const groupedArticles = categories.map((cat) => ({
    ...cat,
    articles: articles.filter((a) => a.category === cat.key),
  }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-foreground">
          Help Center
        </h1>
        <p className="mt-2 font-body text-lg text-muted-foreground">
          Find answers, guides, and support for Metal Gear
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mx-auto max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value.trim()) setSearchResults(null)
            }}
            className="pl-9 font-body"
          />
        </div>
      </form>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchResults(null)
                setSearchQuery('')
              }}
              className="font-body text-xs"
            >
              Clear
            </Button>
          </div>
          {searchResults.map((article) => (
            <Link key={article.id} href={`/help/${article.slug}`}>
              <Card className="border-border bg-card transition-colors hover:border-primary/50">
                <CardContent className="p-4">
                  <p className="font-body font-medium text-foreground">
                    {article.title}
                  </p>
                  <p className="mt-1 font-body text-xs capitalize text-muted-foreground">
                    {article.category.replace('_', ' ')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {searchResults.length === 0 && (
            <p className="py-8 text-center font-body text-muted-foreground">
              No articles found. Try different keywords or browse categories below.
            </p>
          )}
        </div>
      )}

      {/* Categories & Articles */}
      {searchResults === null && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groupedArticles.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] || BookOpen
            return (
              <Card key={cat.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <Icon className="size-5 text-primary" />
                    {cat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {cat.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/help/${article.slug}`}
                      className="block rounded px-2 py-1.5 font-body text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    >
                      {article.title}
                    </Link>
                  ))}
                  {cat.articles.length === 0 && (
                    <p className="px-2 py-1.5 font-body text-xs text-muted-foreground">
                      No articles yet
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* FAQ */}
      {searchResults === null && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <span className="font-body font-medium text-foreground">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                      expandedFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    <p className="font-body text-sm text-muted-foreground">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Contact Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-name" className="font-body">
                  Name
                </Label>
                <Input
                  id="support-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="font-body"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email" className="font-body">
                  Email
                </Label>
                <Input
                  id="support-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="font-body"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-subject" className="font-body">
                  Subject
                </Label>
                <Input
                  id="support-subject"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Brief description"
                  className="font-body"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-category" className="font-body">
                  Category
                </Label>
                <Select value={contactCategory} onValueChange={setContactCategory}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.key} value={c.label} className="font-body">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message" className="font-body">
                Message
              </Label>
              <textarea
                id="support-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-body text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="font-body">
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
