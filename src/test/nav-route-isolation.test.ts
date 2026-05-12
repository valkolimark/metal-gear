import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PROJECT_ROOT = resolve(__dirname, '../..')
const MAIN_DIR = join(PROJECT_ROOT, 'src/app/(main)')
const NEW_NAV_DIR = join(PROJECT_ROOT, 'src/app/(main-new-nav)')

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full)
  }
  return files
}

describe('Cycle 71 — nav route-group isolation', () => {
  it('the legacy (main) group does NOT import AppShellDashboard or AppShellFullBleed', () => {
    const files = walk(MAIN_DIR)
    const offenders: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      if (/AppShellDashboard|AppShellFullBleed/.test(src)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it('the new (main-new-nav) group has a layout.tsx', () => {
    const path = join(NEW_NAV_DIR, 'layout.tsx')
    const layout = readFileSync(path, 'utf8')
    expect(layout).toMatch(/AppShellDashboard/)
  })

  it('only one /feed/page.tsx exists in src/app', () => {
    const allPages: string[] = []
    walk(join(PROJECT_ROOT, 'src/app'), allPages)
    const productionFeedPages = allPages.filter(
      (f) => f.endsWith('/feed/page.tsx') && !f.includes('/design/'),
    )
    expect(productionFeedPages.length).toBe(1)
    expect(productionFeedPages[0]).toMatch(/\(main-new-nav\)/)
  })
})
