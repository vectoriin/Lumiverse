/**
 * Batch-replace common UI strings with i18n.t() calls in TSX files.
 * Run: bun run scripts/i18n-migrate.ts
 */
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, relative } from 'path'

const ROOT = join(import.meta.dir, '..', 'src')
const DIRS = [
  'components/chat',
  'components/chat-heads',
  'components/modals',
  'components/panels',
  'components/settings',
  'components/shared',
  'components/dream-weaver',
  'components/spindle',
]

/** title/aria-label/placeholder exact string -> [namespace, key] */
const ATTR_REPLACEMENTS: [RegExp, string, string][] = [
  [/title="Cancel"/g, 'title={t(\'actions.cancel\', { ns: \'common\' })}', 'common'],
  [/title="Delete"/g, 'title={t(\'actions.delete\', { ns: \'common\' })}', 'common'],
  [/title="Edit"/g, 'title={t(\'actions.edit\', { ns: \'common\' })}', 'common'],
  [/title="Copy"/g, 'title={t(\'actions.copy\', { ns: \'common\' })}', 'common'],
  [/title="Save"/g, 'title={t(\'actions.save\', { ns: \'common\' })}', 'common'],
  [/title="Import"/g, 'title={t(\'actions.import\', { ns: \'common\' })}', 'common'],
  [/title="Export"/g, 'title={t(\'actions.export\', { ns: \'common\' })}', 'common'],
  [/title="Add"/g, 'title={t(\'actions.add\', { ns: \'common\' })}', 'common'],
  [/title="Refresh"/g, 'title={t(\'actions.refresh\', { ns: \'common\' })}', 'common'],
  [/title="Clear"/g, 'title={t(\'actions.clear\', { ns: \'common\' })}', 'common'],
  [/aria-label="Cancel"/g, 'aria-label={t(\'actions.cancel\', { ns: \'common\' })}', 'common'],
  [/aria-label="Delete"/g, 'aria-label={t(\'actions.delete\', { ns: \'common\' })}', 'common'],
  [/aria-label="Edit"/g, 'aria-label={t(\'actions.edit\', { ns: \'common\' })}', 'common'],
  [/aria-label="Copy"/g, 'aria-label={t(\'actions.copy\', { ns: \'common\' })}', 'common'],
  [/aria-label="Save"/g, 'aria-label={t(\'actions.save\', { ns: \'common\' })}', 'common'],
]

const SKIP_FILES = new Set([
  'LanguageSwitcher.tsx',
  'ConnectionLostOverlay.tsx',
  'LoginPage.tsx',
  'LandingPage.tsx',
  'MessageActions.tsx',
])

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) files.push(...await walk(p))
    else if (e.name.endsWith('.tsx') && !SKIP_FILES.has(e.name)) files.push(p)
  }
  return files
}

function inferNamespace(relPath: string): string {
  if (relPath.includes('components/modals')) return 'modals'
  if (relPath.includes('components/panels')) return 'panels'
  if (relPath.includes('components/settings')) return 'settings'
  if (relPath.includes('components/dream-weaver')) return 'dreamWeaver'
  if (relPath.includes('components/chat')) return 'chat'
  if (relPath.includes('components/shared')) return 'shared'
  return 'common'
}

function ensureImport(content: string, ns: string): string {
  if (content.includes('useTranslation')) return content
  const importLine = "import { useTranslation } from 'react-i18next'\n"
  const m = content.match(/^import .+$/m)
  if (m) {
    const idx = content.indexOf(m[0]) + m[0].length + 1
    return content.slice(0, idx) + importLine + content.slice(idx)
  }
  return importLine + content
}

function ensureHook(content: string, ns: string): string {
  if (content.includes('useTranslation(')) return content
  const fnMatch = content.match(/export default function (\w+)/)
  if (!fnMatch) return content
  const hook = `  const { t } = useTranslation('${ns}')\n  const { t: tc } = useTranslation('common')\n`
  const brace = content.indexOf('{', content.indexOf(fnMatch[0]))
  return content.slice(0, brace + 1) + '\n' + hook + content.slice(brace + 1)
}

let changed = 0

for (const dir of DIRS) {
  const abs = join(ROOT, dir)
  const files = await walk(abs)
  for (const file of files) {
    let content = await readFile(file, 'utf8')
    const rel = relative(ROOT, file)
    const ns = inferNamespace(rel)
    let modified = false

    for (const [re, replacement] of ATTR_REPLACEMENTS) {
      if (re.test(content)) {
        content = content.replace(re, replacement)
        modified = true
      }
      re.lastIndex = 0
    }

    if (modified) {
      content = ensureImport(content, ns)
      content = ensureHook(content, ns)
      await writeFile(file, content)
      changed++
      console.log('updated', rel)
    }
  }
}

console.log(`Done. ${changed} files updated.`)
