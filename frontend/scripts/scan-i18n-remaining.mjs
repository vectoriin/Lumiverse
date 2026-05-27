/**
 * Scan frontend/src for likely hardcoded user-visible English strings.
 * Run: node scripts/scan-i18n-remaining.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = 'src'
const SKIP_DIRS = new Set(['locales', 'lib/generated', 'types'])
const SKIP_FILES = new Set(['generatedComponentProps.ts', 'generatedComponentCss.ts', 'generatedCssVariables.ts'])
const SKIP_PATH_PARTS = [
  'lib/componentOverrideSecurity.ts',
  'lib/componentAstCompiler.ts',
  'lib/commands.ts',
  'lib/command-i18n.ts',
]
const TECH_PLACEHOLDER = /^(https?:\/\/|gpt-|GOCSPX|example\.com|npx|WORKGROUP|guest|\.\/|<redacted|redacted_thinking|\d+\s*\/\s*page)/i

const PATTERNS = [
  { name: 'toast-literal', re: /toast\.(?:error|success|warning|info)\(\s*['"`]/g },
  { name: 'addToast-message', re: /addToast\(\s*\{[^}]*message:\s*['"`]/g },
  { name: 'attr-title', re: /(?:title|aria-label)=["']([A-Za-z][^"']{4,})["']/g },
  { name: 'attr-placeholder', re: /placeholder=["']([A-Za-z][^"']{4,})["']/g },
  { name: 'confirm-title', re: /(?:title|confirmText|secondaryText|cancelText):\s*['"]([A-Za-z][^"']{3,})['"]/g },
  { name: 'confirm-message', re: /message:\s*['"]([A-Z][^"']{8,})['"]/g },
  { name: 'label-prop', re: /label:\s*['"]([A-Z][a-zA-Z][^"']{3,})['"]/g },
  { name: 'jsx-text', re: />\s*([A-Z][a-z]+(?:\s+[a-z]+){1,6})\s*</g },
  { name: 'throw-error', re: /throw new Error\(['"]([A-Z][^"']{6,})['"]\)/g },
]

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(p, out)
    } else if (/\.(tsx|ts)$/.test(name) && !SKIP_FILES.has(name)) {
      out.push(p)
    }
  }
  return out
}

function isLikelyI18nLine(line) {
  return /useTranslation|i18n\.t\(|\bt\(|tc\(|lb\(|ts\(|formatTagLibraryImportToastMessage/.test(line)
}

function shouldSkipValue(val) {
  if (!val || val.includes('${') || val.includes('{{')) return true
  if (/^\{/.test(val)) return true
  if (/^[A-Z_]+$/.test(val)) return true
  if (TECH_PLACEHOLDER.test(val)) return true
  if (/^\/\//.test(val)) return true
  if (val.length < 4) return true
  return false
}

const files = walk(ROOT)
const byPattern = Object.fromEntries(PATTERNS.map((p) => [p.name, new Map()]))

for (const file of files) {
  const rel = file.replace(/\\/g, '/')
  if (SKIP_PATH_PARTS.some((p) => rel.endsWith(p))) continue
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')
  for (const pat of PATTERNS) {
    let m
    const re = new RegExp(pat.re.source, pat.re.flags)
    while ((m = re.exec(content)) !== null) {
      const val = m[1] ?? m[0]
      if (shouldSkipValue(val)) continue
      const lineNo = content.slice(0, m.index).split('\n').length
      const line = lines[lineNo - 1] ?? ''
      if (isLikelyI18nLine(line)) continue
      const key = `${rel}:${lineNo}`
      if (!byPattern[pat.name].has(key)) {
        byPattern[pat.name].set(key, { file: rel, line: lineNo, sample: val.slice(0, 80) })
      }
    }
  }
}

let total = 0
for (const [name, map] of Object.entries(byPattern)) {
  if (map.size === 0) continue
  console.log(`\n=== ${name} (${map.size}) ===`)
  for (const hit of [...map.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line).slice(0, 40)) {
    console.log(`  ${hit.file}:${hit.line}  ${hit.sample}`)
    total++
  }
  if (map.size > 40) console.log(`  ... +${map.size - 40} more`)
}
console.log(`\nTotal hits (capped display): ${total}`)
if (total === 0) console.log('No likely hardcoded UI strings found.')
