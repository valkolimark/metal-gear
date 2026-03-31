'use client'

import { useState, useCallback } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  Globe,
  FileText,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { parseImportFile } from '@/app/actions/import'
import type { ParseImportResult } from '@/app/actions/import'

type FileFormat = 'csv' | 'xlsx' | 'google_sheets'

const CSV_TEMPLATE =
  'title,description,category,condition,price,city,state,industry,manufacturer,model,year,image_url_1,image_url_2,image_url_3\n' +
  '"CNC Milling Machine 5-Axis","High-precision 5-axis CNC mill, 2020 model",CNC Machines,good,45000,Houston,TX,Manufacturing,Haas,VF-2SS,2020,https://example.com/cnc-front.jpg,https://example.com/cnc-side.jpg,https://example.com/cnc-nameplate.jpg\n' +
  '"Industrial Air Compressor 100HP","Atlas Copco rotary screw compressor",Compressors,like_new,28500,Houston,TX,Oil & Gas,Atlas Copco,GA90,2019,,\n'

interface ImportUploadZoneProps {
  onParsed: (result: ParseImportResult, fileName: string | null, format: FileFormat) => void
}

export function ImportUploadZone({ onParsed }: ImportUploadZoneProps) {
  const [format, setFormat] = useState<FileFormat>('csv')
  const [googleUrl, setGoogleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true)
      try {
        const formData = new FormData()
        formData.set('file', file)
        formData.set('format', format)
        const result = await parseImportFile(formData)

        if (result.errors.length > 0) {
          toast.error(result.errors[0])
          if (result.rows.length === 0) {
            setLoading(false)
            return
          }
        }

        onParsed(result, file.name, format)
      } catch {
        toast.error('Failed to parse file')
      }
      setLoading(false)
    },
    [format, onParsed]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      handleFile(file)
    },
    [handleFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleGoogleSheet = useCallback(async () => {
    if (!googleUrl.trim()) {
      toast.error('Please paste a Google Sheets URL')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('googleUrl', googleUrl.trim())
      formData.set('format', 'google_sheets')
      const result = await parseImportFile(formData)

      if (result.errors.length > 0) {
        toast.error(result.errors[0])
        if (result.rows.length === 0) {
          setLoading(false)
          return
        }
      }

      onParsed(result, null, 'google_sheets')
    } catch {
      toast.error('Failed to fetch Google Sheet')
    }
    setLoading(false)
  }, [googleUrl, onParsed])

  function downloadTemplate(type: 'csv' | 'xlsx') {
    if (type === 'csv') {
      const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'metal-gear-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // For XLSX, download CSV with xlsx extension instruction
      const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'metal-gear-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const tabs: { id: FileFormat; label: string; icon: React.ReactNode }[] = [
    { id: 'csv', label: 'CSV', icon: <FileText className="size-4" /> },
    { id: 'xlsx', label: 'Excel', icon: <FileSpreadsheet className="size-4" /> },
    { id: 'google_sheets', label: 'Google Sheets', icon: <Globe className="size-4" /> },
  ]

  const acceptMap: Record<string, string> = {
    csv: '.csv',
    xlsx: '.xlsx,.xls',
    google_sheets: '',
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-6 p-6">
        {/* Format Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFormat(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-body text-sm font-medium transition-colors ${
                format === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Upload Zone or Google Sheets Input */}
        {format === 'google_sheets' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-body text-sm font-medium text-foreground">
                Google Sheets URL
              </label>
              <p className="font-body text-xs text-muted-foreground">
                Sheet must be shared as &quot;Anyone with the link can view&quot;
              </p>
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              onClick={handleGoogleSheet}
              disabled={loading || !googleUrl.trim()}
              className="w-full font-body"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Preview Sheet'
              )}
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed py-12 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="font-body text-sm text-muted-foreground">
                  Parsing file...
                </p>
              </>
            ) : (
              <>
                <Upload className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-foreground">
                    {format === 'csv'
                      ? 'Upload your CSV file'
                      : 'Upload your Excel file'}
                  </p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">
                    Drag & drop or click to browse
                  </p>
                </div>
                <label className="cursor-pointer">
                  <Button asChild className="font-body">
                    <span>Choose File</span>
                  </Button>
                  <input
                    type="file"
                    accept={acceptMap[format]}
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        )}

        <Separator />

        {/* Download Templates */}
        <div className="flex items-center justify-between">
          <p className="font-body text-sm text-muted-foreground">
            Download template
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('csv')}
              className="font-body"
            >
              <Download className="mr-1.5 size-3" />
              CSV
            </Button>
          </div>
        </div>

        {/* Format Hints */}
        <div className="space-y-1.5">
          <p className="font-body text-xs font-medium text-muted-foreground">Image columns</p>
          <ul className="list-inside list-disc space-y-1 font-body text-xs text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1 py-0.5">image_url_1</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5">image_url_2</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5">image_url_3</code>...
              — numbered image columns, one URL per column (up to your plan&apos;s photo limit)
            </li>
            <li>
              <code className="rounded bg-muted px-1 py-0.5">image_url</code> — single column also accepted; pipe-separate multiple URLs:{' '}
              <code className="rounded bg-muted px-1 py-0.5">https://img1.jpg|https://img2.jpg</code>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
