'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { validateCSVRows, processCSVImport, getImportHistory } from './actions'
import type { Tables } from '@/types/database'

const CSV_TEMPLATE =
  'title,description,category,condition,price,city,state,industry\n' +
  '"CNC Milling Machine 5-Axis","High-precision 5-axis CNC mill, 2020 model",CNC Machines,good,45000,Houston,TX,Manufacturing\n' +
  '"Industrial Air Compressor 100HP","Atlas Copco rotary screw compressor",Compressors,like_new,28500,Houston,TX,Oil & Gas\n'

interface ParsedRow {
  row: number
  title: string
  description: string
  category: string
  condition: string
  price: string
  city: string
  state: string
  industry: string
  errors: string[]
  valid: boolean
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

export default function CSVImportPage() {
  const { profile } = useAuthStore()
  const tier = profile?.subscription_tier ?? 'free'
  const [step, setStep] = useState<ImportStep>('upload')
  const [filename, setFilename] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    successCount: number
    errorCount: number
  } | null>(null)
  const [history, setHistory] = useState<Tables<'listing_imports'>[]>([])

  useEffect(() => {
    getImportHistory().then((res) => setHistory(res.imports ?? []))
  }, [])

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file')
        return
      }

      setFilename(file.name)

      const text = await file.text()
      const { rows, error } = await validateCSVRows(text)

      if (error) {
        toast.error(error)
        return
      }

      setParsedRows(rows)
      setStep('preview')
    },
    []
  )

  async function handleImport() {
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)
    setStep('importing')

    try {
      const res = await processCSVImport(
        filename,
        validRows.map((r) => ({
          title: r.title,
          description: r.description,
          category: r.category,
          condition: r.condition,
          price: r.price,
          city: r.city,
          state: r.state,
          industry: r.industry,
        }))
      )

      if ('error' in res && res.error) {
        toast.error(res.error)
        setStep('preview')
        return
      }

      setResult({
        successCount: res.successCount ?? 0,
        errorCount: res.errorCount ?? 0,
      })
      setStep('done')

      // Refresh history
      getImportHistory().then((r) => setHistory(r.imports ?? []))
    } catch {
      toast.error('Import failed')
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metal-gear-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetImport() {
    setStep('upload')
    setParsedRows([])
    setFilename('')
    setResult(null)
  }

  if (tier === 'free') {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileSpreadsheet className="size-12 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold text-foreground">
              Premium Feature
            </h2>
            <p className="text-center font-body text-sm text-muted-foreground">
              CSV import is available on Premium and Boost plans.
            </p>
            <Button asChild className="font-body">
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const errorRowCount = parsedRows.filter((r) => !r.valid).length

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
            Bulk import equipment listings from a CSV file
          </p>
        </div>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border py-12">
                <Upload className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-foreground">
                    Upload your CSV file
                  </p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    Required columns: title, description, category, condition,
                    price, city, state, industry
                  </p>
                </div>
                <label className="cursor-pointer">
                  <Button asChild className="font-body">
                    <span>Choose File</span>
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <p className="font-body text-sm text-muted-foreground">
                  Need a template?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="font-body"
                >
                  <Download className="mr-1.5 size-3" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

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
                          {imp.filename}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {new Date(imp.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 font-body text-[10px] text-green-400">
                          {imp.success_count} imported
                        </Badge>
                        {imp.error_count > 0 && (
                          <Badge className="bg-red-500/20 font-body text-[10px] text-red-400">
                            {imp.error_count} errors
                          </Badge>
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
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/20 font-body text-green-400">
                <Check className="mr-1 size-3" />
                {validCount} valid
              </Badge>
              {errorRowCount > 0 && (
                <Badge className="bg-red-500/20 font-body text-red-400">
                  <X className="mr-1 size-3" />
                  {errorRowCount} errors
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetImport}
                className="font-body"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="font-body"
              >
                Import {validCount} Listing{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Category
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Condition
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Location
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr
                        key={row.row}
                        className={`border-b border-border ${
                          !row.valid ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="p-3 text-muted-foreground">
                          {row.row}
                        </td>
                        <td className="max-w-[200px] truncate p-3 text-foreground">
                          {row.title || '—'}
                        </td>
                        <td className="p-3 text-foreground">
                          {row.category || '—'}
                        </td>
                        <td className="p-3 text-foreground">
                          {row.condition.replace('_', ' ') || '—'}
                        </td>
                        <td className="p-3 text-foreground">
                          {row.price
                            ? `$${Number(row.price).toLocaleString()}`
                            : 'Contact'}
                        </td>
                        <td className="p-3 text-foreground">
                          {row.city}, {row.state}
                        </td>
                        <td className="p-3">
                          {row.valid ? (
                            <Check className="size-4 text-green-400" />
                          ) : (
                            <div className="flex items-start gap-1">
                              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-red-400" />
                              <span className="text-xs text-red-400">
                                {row.errors.join('; ')}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="font-body text-sm text-muted-foreground">
              Importing {validCount} listings as drafts...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Done Step */}
      {step === 'done' && result && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="size-8 text-green-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Import Complete
            </h2>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/20 font-body text-green-400">
                {result.successCount} imported
              </Badge>
              {result.errorCount > 0 && (
                <Badge className="bg-red-500/20 font-body text-red-400">
                  {result.errorCount} failed
                </Badge>
              )}
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Listings were created as drafts. Review and publish them from your
              listings page.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetImport} className="font-body">
                Import More
              </Button>
              <Button asChild className="font-body">
                <Link href="/listings">View Listings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
