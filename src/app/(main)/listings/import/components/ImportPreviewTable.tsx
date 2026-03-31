'use client'

import { Check, X, AlertTriangle, ImageIcon, Images, Copy, RefreshCw, SkipForward, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ParseImportResult, DuplicateMode, DedupResult } from '@/app/actions/import'

interface ImportPreviewTableProps {
  result: ParseImportResult
  onImport: () => void
  onCancel: () => void
  importing: boolean
  dedupResult?: DedupResult | null
  duplicateMode?: DuplicateMode
  onDuplicateModeChange?: (mode: DuplicateMode) => void
  checkingDupes?: boolean
}

export function ImportPreviewTable({
  result,
  onImport,
  onCancel,
  importing,
  dedupResult,
  duplicateMode = 'create_new',
  onDuplicateModeChange,
  checkingDupes,
}: ImportPreviewTableProps) {
  const validCount = result.rows.filter((r) => r.errors.length === 0).length
  const errorRowCount = result.rows.filter((r) => r.errors.length > 0).length
  const previewRows = result.rows.slice(0, 5)
  const hasImages = result.rows.some((r) => r.image_urls.length > 0)
  const hasDuplicates = dedupResult && dedupResult.duplicateCount > 0

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
          {result.detectedImageColumnCount > 0 && (
            <Badge className="bg-blue-500/20 font-body text-blue-400">
              <ImageIcon className="mr-1 size-3" />
              {result.rows.some(r => r.image_urls.length > 1)
                ? result.detectedImageColumnCount > 1
                  ? `${result.detectedImageColumnCount} image columns`
                  : 'Multi-image (pipe-separated)'
                : '1 image column'}
            </Badge>
          )}
          {checkingDupes && (
            <Badge className="bg-muted font-body text-muted-foreground">
              <Loader2 className="mr-1 size-3 animate-spin" />
              Checking duplicates...
            </Badge>
          )}
          {hasDuplicates && (
            <Badge className="bg-orange-500/20 font-body text-orange-400">
              <Copy className="mr-1 size-3" />
              {dedupResult.duplicateCount} duplicate{dedupResult.duplicateCount !== 1 ? 's' : ''} found
            </Badge>
          )}
          {result.unmappedHeaders.length > 0 && (
            <Badge className="bg-yellow-500/20 font-body text-yellow-400">
              <AlertTriangle className="mr-1 size-3" />
              {result.unmappedHeaders.length} column{result.unmappedHeaders.length !== 1 ? 's' : ''} ignored
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={importing}
            className="font-body"
          >
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={validCount === 0 || importing}
            className="font-body"
          >
            Import {validCount} Listing{validCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      {/* Duplicate Handling Options */}
      {hasDuplicates && onDuplicateModeChange && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <p className="mb-3 font-body text-sm font-medium text-foreground">
              {dedupResult.duplicateCount} listing{dedupResult.duplicateCount !== 1 ? 's' : ''} already exist{dedupResult.duplicateCount === 1 ? 's' : ''} (matched by SKU or title+manufacturer+model).
              How should duplicates be handled?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={duplicateMode === 'skip' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDuplicateModeChange('skip')}
                className="font-body"
              >
                <SkipForward className="mr-1.5 size-3" />
                Skip duplicates ({dedupResult.newCount} new only)
              </Button>
              <Button
                variant={duplicateMode === 'update' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDuplicateModeChange('update')}
                className="font-body"
              >
                <RefreshCw className="mr-1.5 size-3" />
                Update existing + create new
              </Button>
              <Button
                variant={duplicateMode === 'create_new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDuplicateModeChange('create_new')}
                className="font-body"
              >
                <Copy className="mr-1.5 size-3" />
                Create all as new
              </Button>
            </div>
            {dedupResult.duplicateSkus.length > 0 && (
              <p className="mt-2 font-body text-xs text-muted-foreground">
                Matched SKUs: {dedupResult.duplicateSkus.join(', ')}
                {dedupResult.duplicateCount > dedupResult.duplicateSkus.length && ` and ${dedupResult.duplicateCount - dedupResult.duplicateSkus.length} more`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Info */}
      <div className="flex flex-wrap gap-2">
        {result.mappedHeaders.map((h) => (
          <span
            key={h}
            className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 font-body text-xs text-green-400"
          >
            <Check className="size-3" />
            {h}
          </span>
        ))}
        {result.unmappedHeaders.map((h) => (
          <span
            key={h}
            className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 font-body text-xs text-yellow-400"
          >
            <AlertTriangle className="size-3" />
            {h} (ignored)
          </span>
        ))}
      </div>

      {/* Preview Table */}
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
                  {hasImages && (
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                      Images
                    </th>
                  )}
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => {
                  const priceVal = row.data.price?.replace(/[$,]/g, '')
                  const price = priceVal ? parseFloat(priceVal) : null

                  return (
                    <tr
                      key={row.rowIndex}
                      className={`border-b border-border ${
                        row.errors.length > 0 ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="p-3 text-muted-foreground">
                        {row.rowIndex}
                      </td>
                      <td className="max-w-[200px] truncate p-3 text-foreground">
                        {row.data.title || '—'}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.category || '—'}
                      </td>
                      <td className="p-3 text-foreground">
                        {row.data.condition?.replace('_', ' ') || '—'}
                      </td>
                      <td className="p-3 text-foreground">
                        {price
                          ? `$${price.toLocaleString()}`
                          : 'Contact'}
                      </td>
                      <td className="p-3 text-foreground">
                        {[row.data.city, row.data.state]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      {hasImages && (
                        <td className="p-3 text-foreground">
                          {row.image_urls.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : row.image_urls.length === 1 ? (
                            <Badge variant="secondary" className="text-xs">1 image</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Images className="size-3" />
                              {row.image_urls.length} images
                            </Badge>
                          )}
                        </td>
                      )}
                      <td className="p-3">
                        {row.errors.length === 0 ? (
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
                  )
                })}
              </tbody>
            </table>
          </div>
          {result.totalRows > 5 && (
            <div className="border-t border-border p-3 text-center">
              <p className="font-body text-xs text-muted-foreground">
                Showing 5 of {result.totalRows} rows
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image summary */}
      {(() => {
        const totalImageCount = result.rows.reduce((n, r) => n + r.image_urls.length, 0)
        const rowsWithImages = result.rows.filter(r => r.image_urls.length > 0).length
        if (totalImageCount === 0) return null
        return (
          <p className="text-xs text-muted-foreground">
            {totalImageCount} total image{totalImageCount !== 1 ? 's' : ''} detected across{' '}
            {rowsWithImages} listing{rowsWithImages !== 1 ? 's' : ''}
          </p>
        )
      })()}
    </div>
  )
}
