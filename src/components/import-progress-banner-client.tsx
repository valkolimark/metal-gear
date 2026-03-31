'use client'
// Thin client wrapper for ImportProgressBanner.
// Matches the MobileNavClient pattern in (main)/layout.tsx.
// No props — all state flows through importStore.
import { ImportProgressBanner } from '@/components/import-progress-banner'
export function ImportProgressBannerClient() {
  return <ImportProgressBanner />
}
