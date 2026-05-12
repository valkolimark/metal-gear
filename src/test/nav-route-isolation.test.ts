import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PROJECT_ROOT = resolve(__dirname, '../..')
const MAIN_DIR = join(PROJECT_ROOT, 'src/app/(main)')
const NEW_NAV_DIR = join(PROJECT_ROOT, 'src/app/(main-new-nav)')
const FULL_BLEED_DIR = join(PROJECT_ROOT, 'src/app/(main-new-nav-fullbleed)')

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

describe('Cycle 73 — storefront cluster route-group isolation', () => {
  it('the new (main-new-nav-fullbleed) group has a layout.tsx that mounts AppShellFullBleed', () => {
    const path = join(FULL_BLEED_DIR, 'layout.tsx')
    const layout = readFileSync(path, 'utf8')
    expect(layout).toMatch(/AppShellFullBleed/)
  })

  it.each([
    ['sellers/[id]', /\(main-new-nav-fullbleed\)/],
    ['companies/[slug]', /\(main-new-nav-fullbleed\)/],
    ['profile', /\(main-new-nav-fullbleed\)/],
    ['profile/[id]', /\(main-new-nav-fullbleed\)/],
  ])('only one production /%s/page.tsx exists, in (main-new-nav-fullbleed)', (route, groupRegex) => {
    const allPages: string[] = []
    walk(join(PROJECT_ROOT, 'src/app'), allPages)
    const matches = allPages.filter(
      (f) => f.endsWith(`/${route}/page.tsx`) && !f.includes('/design/'),
    )
    expect(matches.length).toBe(1)
    expect(matches[0]).toMatch(groupRegex)
  })
})

describe('Cycle 74 — dashboard secondaries + settings route-group isolation', () => {
  it.each([
    ['dashboard', /\(main-new-nav\)/],
    ['radar', /\(main-new-nav\)/],
    ['credits', /\(main-new-nav\)/],
    ['notifications', /\(main-new-nav\)/],
    ['favorites', /\(main-new-nav\)/],
    ['saved-searches', /\(main-new-nav\)/],
    ['transactions', /\(main-new-nav\)/],
  ])('only one production /%s/page.tsx exists, in (main-new-nav)', (route, groupRegex) => {
    const allPages: string[] = []
    walk(join(PROJECT_ROOT, 'src/app'), allPages)
    const matches = allPages.filter(
      (f) => f.endsWith(`/${route}/page.tsx`) && !f.includes('/design/'),
    )
    expect(matches.length).toBe(1)
    expect(matches[0]).toMatch(groupRegex)
  })

  it('every /settings/* production page lives under (main-new-nav-fullbleed)', () => {
    const allPages: string[] = []
    walk(join(PROJECT_ROOT, 'src/app'), allPages)
    const settingsPages = allPages.filter(
      (f) => /\/settings\/.+\/page\.tsx$/.test(f) && !f.includes('/design/'),
    )
    expect(settingsPages.length).toBeGreaterThan(0)
    for (const path of settingsPages) {
      expect(path).toMatch(/\(main-new-nav-fullbleed\)/)
    }
  })

  it('the legacy (main) group contains no migrated routes from Cycle 74', () => {
    const allPages: string[] = []
    walk(MAIN_DIR, allPages)
    const offenders = allPages.filter((f) =>
      /\/(dashboard|radar|credits|notifications|favorites|saved-searches|transactions|settings)\/[^/]*page\.tsx$/.test(
        f,
      ),
    )
    expect(offenders).toEqual([])
  })
})
