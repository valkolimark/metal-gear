#!/usr/bin/env node
/**
 * Cycle 66 — archetype reference grep gate.
 *
 * Soft-disabled archetypes (`trader`, `logistics`) must not be hard-coded as
 * string literals outside the helper, the constants file, the admin re-
 * activation panel, archetype-specific UI preserved for re-activation, and
 * unrelated namespaces (e.g. the `logistics` ROLE option in equipment
 * taxonomy). This script runs in CI to catch new references that would
 * silently couple to disabled archetypes during dormancy.
 *
 * Usage: node scripts/check-archetype-references.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// Files where 'trader' / 'logistics' string literals are permitted.
// Each entry has a one-line note explaining why it's exempt.
const ALLOWLIST = new Set([
  // Helper + type definitions — the canonical place to know about archetypes.
  'src/lib/archetypes.ts',
  'src/lib/constants/onboarding.ts',
  // Admin re-activation surfaces.
  'src/app/(admin)/admin/settings/components/EnabledArchetypesPanel.tsx',
  'src/app/(admin)/admin/actions.ts',
  // Archetype-specific server actions: branching logic preserved for grandfathered users.
  'src/app/actions/archetype.ts',
  'src/app/actions/onboarding.ts',
  'src/app/actions/sos.ts',
  'src/app/actions/admin-sos.ts',
  // Archetype-specific UI: legacy migration banner + onboarding step components.
  'src/components/archetype-migration-banner.tsx',
  'src/app/(onboarding)/onboarding/OnboardingClient.tsx',
  // Middleware archetype-cookie guard for logistics route blocking.
  'src/lib/supabase/middleware.ts',
  // Equipment taxonomy ROLES list — unrelated namespace ('logistics' here is a ROLE option, not an archetype).
  'src/lib/constants/equipment-taxonomy.ts',
  // Dev seed script: not user-facing.
  'scripts/seed-feed-data.ts',
  // This script itself.
  'scripts/check-archetype-references.mjs',
  // Tests covering the helper / admin actions need to assert on disabled archetype behavior.
  'src/test/archetypes-helper.test.ts',
  'src/test/admin-enabled-archetypes.test.ts',
])

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.vercel',
  'public',
])

const ROOT_DIRS = ['src', 'scripts']
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs'])

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(full)
    } else if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      yield full
    }
  }
}

// Match standalone string literals: 'trader' / "trader" / `trader` and same
// for logistics. The closing quote must match the opening quote, so this
// won't match substrings like "trader_" or "logisticscoverage".
const PATTERN = /(['"`])(trader|logistics)\1/g

const violations = []
let scanned = 0

for (const rootDir of ROOT_DIRS) {
  const abs = path.join(PROJECT_ROOT, rootDir)
  if (!fs.existsSync(abs)) continue
  for (const filePath of walk(abs)) {
    const rel = path.relative(PROJECT_ROOT, filePath)
    if (ALLOWLIST.has(rel)) continue
    scanned += 1
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      PATTERN.lastIndex = 0
      let match
      while ((match = PATTERN.exec(line)) !== null) {
        violations.push({
          file: rel,
          line: i + 1,
          match: match[0],
          context: line.trim(),
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('\n✗ Archetype reference check failed.\n')
  console.error('Found hard-coded archetype string literals outside the allowlist.')
  console.error('Either route through `isArchetypeEnabled()` / `getEnabledArchetypes()`')
  console.error('in `src/lib/archetypes.ts`, or add the file to the ALLOWLIST in')
  console.error('`scripts/check-archetype-references.mjs` with a one-line comment.\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.match}`)
    console.error(`    ${v.context}`)
  }
  console.error(`\n${violations.length} violation(s) across ${scanned} files.\n`)
  process.exit(1)
}

console.log(`✓ archetype reference check passed (${scanned} files scanned)`)
