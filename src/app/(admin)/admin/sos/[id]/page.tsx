import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSOSDetail } from '@/app/actions/admin-sos'
import { SOSDetailClient } from './SOSDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const sos = await getSOSDetail(id)
  return {
    title: sos ? `SOS: ${sos.title} — Admin` : 'SOS Not Found — Admin',
  }
}

export default async function AdminSOSDetailPage({ params }: PageProps) {
  const { id } = await params
  const sos = await getSOSDetail(id)
  if (!sos) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link
        href="/admin/sos"
        className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to SOS Monitor
      </Link>
      <SOSDetailClient sos={sos} sosId={id} />
    </div>
  )
}
