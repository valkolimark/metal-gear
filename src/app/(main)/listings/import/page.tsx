'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileSpreadsheet, Clock, Trash2, Loader2 as Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { startImportJob, getImportHistory, checkImportDuplicates, bulkDeleteByImport } from '@/app/actions/import'
import { ImportUploadZone } from './components/ImportUploadZone'
import { ImportPreviewTable } from './components/ImportPreviewTable'
import { ImportProgressBar } from './components/ImportProgressBar'
import { ImportCompleteSummary } from './components/ImportCompleteSummary'
import type { ParseImportResult, DuplicateMode, DedupResult } from '@/app/actions/import'
import type { ImportProgressData } from './components/ImportProgressBar'
import type { Tables } from '@/types/database'

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'
type FileFormat = 'csv' | 'xlsx' | 'google_sheets'

export default function ImportPage() {
  const { profile } = useAuthStore()
  const tier = profile?.subscription_tier ?? 'free'
  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileFormat, setFileFormat] = useState<FileFormat>('csv')
  const [importId, setImportId] = useState<string | null>(null)
  const [completeData, setCompleteData] = useState<ImportProgressData | null>(null)
  const [history, setHistory] = useState<Tables<'listing_imports'>[]>([])
  const [dedupResult, setDedupResult] = useState<DedupResult | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('create_new')
  const [checkingDupes, setCheckingDupes] = useState(false)
  const [deletingImport, setDeletingImport] = useState<string | null>(null)

  useEffect(() => {
    getImportHistory().then((res) => setHistory(res.imports ?? []))
  }, [])

  // Warn before navigation during import
  useEffect(() => {
    if (step !== 'importing') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [step])

  const handleParsed = useCallback(
    async (result: ParseImportResult, name: string | null, format: FileFormat) => {
      setParseResult(result)
      setFileName(name)
      setFileFormat(format)
      setStep('preview')

      // Check for duplicates in background
      const validRows = result.rows.filter(r => r.errors.length === 0)
      if (validRows.length > 0) {
        setCheckingDupes(true)
        try {
          const dupes = await checkImportDuplicates(result.rows)
          if (!dupes.error) {
            setDedupResult(dupes)
            if (dupes.duplicateCount > 0) {
              setDuplicateMode('skip') // Default to skip when dupes found
            }
          }
        } catch {
          // Non-critical — proceed without dedup info
        }
        setCheckingDupes(false)
      }
    },
    []
  )

  const handleImport = useCallback(async () => {
    if (!parseResult) return

    const validRows = parseResult.rows.filter((r) => r.errors.length === 0)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setStep('importing')

    try {
      const result = await startImportJob(parseResult.rows, fileName, fileFormat, duplicateMode)

      if (result.error) {
        toast.error(result.error)
        setStep('preview')
        return
      }

      if (result.tierLimitWarning) {
        toast.warning(result.tierLimitWarning)
      }

      if (result.skippedCount && result.skippedCount > 0) {
        toast.info(`${result.skippedCount} duplicate${result.skippedCount !== 1 ? 's' : ''} skipped`)
      }

      if (result.updatedCount && result.updatedCount > 0) {
        toast.success(`${result.updatedCount} existing listing${result.updatedCount !== 1 ? 's' : ''} updated`)
      }

      setImportId(result.importId)
    } catch {
      toast.error('Failed to start import')
      setStep('preview')
    }
  }, [parseResult, fileName, fileFormat, duplicateMode])

  const handleComplete = useCallback((data: ImportProgressData) => {
    setCompleteData(data)
    setStep('done')
    // Refresh history
    getImportHistory().then((r) => setHistory(r.imports ?? []))
  }, [])

  async function handleDeleteImport(impId: string) {
    setDeletingImport(impId)
    try {
      const result = await bulkDeleteByImport(impId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${result.deletedCount} listing${result.deletedCount !== 1 ? 's' : ''} removed`)
        getImportHistory().then((r) => setHistory(r.imports ?? []))
      }
    } catch {
      toast.error('Failed to delete import listings')
    }
    setDeletingImport(null)
  }

  function resetImport() {
    setStep('upload')
    setParseResult(null)
    setFileName(null)
    setImportId(null)
    setCompleteData(null)
    setDedupResult(null)
    setDuplicateMode('create_new')
  }

  if (tier === 'free') {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileSpreadsheet className="size-12 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold text-foreground">
              Pro Feature
            </h2>
            <p className="text-center font-body text-sm text-muted-foreground">
              Bulk import is available on Pro and higher plans.
            </p>
            <Button asChild className="font-body">
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="font-body">
          <Link href="/listings">
            <ArrowLeft className="mr-1 size-3" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Import Listings
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Bulk import from CSV, Excel, or Google Sheets
          </p>
        </div>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-4">
          <ImportUploadZone onParsed={handleParsed} />

          {/* Import History */}
          {history.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <Clock className="size-5" />
                  Import History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map((imp) => (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-body text-sm font-medium text-foreground">
                          {imp.filename || 'Google Sheets import'}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-body text-xs text-muted-foreground">
                            {new Date(imp.created_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                          {imp.file_format && (
                            <Badge
                              variant="outline"
                              className="font-body text-[10px]"
                            >
                              {imp.file_format.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 font-body text-[10px] text-green-400">
                          {imp.successful_rows || imp.success_count} imported
                        </Badge>
                        {(imp.failed_rows || imp.error_count) > 0 && (
                          <Badge className="bg-red-500/20 font-body text-[10px] text-red-400">
                            {imp.failed_rows || imp.error_count} errors
                          </Badge>
                        )}
                        {imp.image_fetch_succeeded > 0 && (
                          <Badge className="bg-blue-500/20 font-body text-[10px] text-blue-400">
                            {imp.image_fetch_succeeded} images
                          </Badge>
                        )}
                        {imp.created_listing_ids && (imp.created_listing_ids as string[]).length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteImport(imp.id)}
                            disabled={deletingImport === imp.id}
                            title="Remove all listings from this import"
                          >
                            {deletingImport === imp.id ? (
                              <Loader2Icon className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && parseResult && (
        <ImportPreviewTable
          result={parseResult}
          onImport={handleImport}
          onCancel={resetImport}
          importing={false}
          dedupResult={dedupResult}
          duplicateMode={duplicateMode}
          onDuplicateModeChange={setDuplicateMode}
          checkingDupes={checkingDupes}
        />
      )}

      {/* Importing Step */}
      {step === 'importing' && importId && parseResult && (
        <ImportProgressBar
          importId={importId}
          totalRows={parseResult.rows.filter((r) => r.errors.length === 0).length}
          hasImageUrls={parseResult.imageUrlCount > 0}
          onComplete={handleComplete}
        />
      )}

      {/* Done Step */}
      {step === 'done' && completeData && (
        <ImportCompleteSummary data={completeData} onReset={resetImport} />
      )}
    </div>
  )
}
