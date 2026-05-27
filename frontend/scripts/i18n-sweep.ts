/**
 * Bulk i18n sweep: migrate common UI attribute strings across all component TSX files.
 * Run: bun run scripts/i18n-sweep.ts
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(import.meta.dir, '../src/components')
const SKIP = new Set([
  'LanguageSwitcher.tsx',
])

const COMMON_ATTRS: Record<string, string> = {
  'Cancel': 'actions.cancel',
  'Delete': 'actions.delete',
  'Edit': 'actions.edit',
  'Copy': 'actions.copy',
  'Save': 'actions.save',
  'Close': 'actions.close',
  'Confirm': 'actions.confirm',
  'Import': 'actions.import',
  'Export': 'actions.export',
  'Add': 'actions.add',
  'Search': 'actions.search',
  'Refresh': 'actions.refresh',
  'Clear': 'actions.clear',
  'Select': 'actions.select',
  'Move': 'actions.move',
  'Back': 'actions.back',
  'Apply': 'actions.apply',
  'Reset': 'actions.reset',
  'Remove': 'actions.delete',
  'Rename': 'actions.edit',
  'Loading…': 'actions.loading',
  'Loading...': 'actions.loading',
}

function inferNs(rel: string): string {
  if (rel.includes('/modals/')) return 'modals'
  if (rel.includes('/panels/')) return 'panels'
  if (rel.includes('/settings/')) return 'settings'
  if (rel.includes('/dream-weaver/')) return 'dreamWeaver'
  if (rel.includes('/chat/')) return 'chat'
  if (rel.includes('/shared/')) return 'shared'
  if (rel.includes('/spindle/')) return 'spindle'
  return 'common'
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.tsx')) out.push(p)
  }
  return out
}

function ensureImport(content: string): string {
  if (content.includes("from 'react-i18next'") || content.includes('from "react-i18next"')) return content
  const m = content.match(/^import .+$/m)
  if (m) {
    const idx = content.indexOf(m[0]) + m[0].length + 1
    return content.slice(0, idx) + "import { useTranslation } from 'react-i18next'\n" + content.slice(idx)
  }
  return "import { useTranslation } from 'react-i18next'\n" + content
}

function ensureDefaultHook(content: string, ns: string): string {
  if (/useTranslation\(/.test(content)) return content
  const m = content.match(/export default function (\w+)\s*\(([^)]*)\)\s*\{/)
  if (!m) return content
  const hook = `\n  const { t } = useTranslation('${ns}')\n  const { t: tc } = useTranslation('common')\n`
  const insertAt = content.indexOf('{', content.indexOf(m[0])) + 1
  return content.slice(0, insertAt) + hook + content.slice(insertAt)
}

let changed = 0

for (const file of walk(SRC)) {
  const base = file.split(/[/\\]/).pop()!
  if (SKIP.has(base)) continue
  let content = readFileSync(file, 'utf8')
  if (/useTranslation|i18n\.t\(/.test(content)) continue

  const rel = relative(join(import.meta.dir, '../src'), file).replace(/\\/g, '/')
  const ns = inferNs(rel)
  let modified = false

  for (const [en, key] of Object.entries(COMMON_ATTRS)) {
    const esc = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`title="${esc}"`, 'g'),
      new RegExp(`title='${esc}'`, 'g'),
      new RegExp(`aria-label="${esc}"`, 'g'),
      new RegExp(`aria-label='${esc}'`, 'g'),
    ]
    const rep = key.startsWith('actions.') ? `tc('${key}')` : `t('${key}')`
    for (const re of patterns) {
      if (re.test(content)) {
        content = content.replace(re, (m) => m.replace(en, `{${rep}}`).replace(/title="\{/, 'title={').replace(/aria-label="\{/, 'aria-label={'))
        // fix: title="Delete" -> title={tc('actions.delete')}
        content = content.replace(
          new RegExp(`(title|aria-label)=["']${esc}["']`, 'g'),
          `$1={${rep}}`,
        )
        modified = true
      }
    }
  }

  if (!modified) continue

  content = ensureImport(content)
  content = ensureDefaultHook(content, ns)
  writeFileSync(file, content)
  changed++
  console.log('swept', rel)
}

console.log(`\nSwept ${changed} files. Run typecheck and i18n-progress.ts next.`)
