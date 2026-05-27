/**
 * Fixes migration script bug: hooks inserted inside destructured params,
 * broken imports, and stray `"` after `)}` in JSX attributes.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..', 'src')

const HOOK_BLOCK_RE =
  /export default function (\w+)\(\{\s*\n\s*const \{ t \} = useTranslation\(([^)]+)\)\s*\n(?:\s*const \{ t: tc \} = useTranslation\(([^)]+)\)\s*\n)?([\s\S]*?)\}: (\w+)\) \{\s*\n/

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walkTsx(full, out)
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(full)
  }
  return out
}

async function main() {
  const paths = walkTsx(ROOT)
  let hookFixed = 0
  let quoteFixed = 0

  for (const path of paths) {
    const rel = path.slice(ROOT.length + 1).replace(/\\/g, '/')
    let content = readFileSync(path, 'utf8')
    const original = content

    content = content.replace(
      /import \{\r?\nimport \{ useTranslation \} from 'react-i18next'\r?\n\r?\n/g,
      "import { useTranslation } from 'react-i18next'\nimport {\n",
    )

    const m = content.match(HOOK_BLOCK_RE)
    if (m) {
      const [, fnName, tNs, tcNs, params, propsType] = m
      const tcLine = tcNs
        ? `  const { t: tc } = useTranslation(${tcNs})\n`
        : ''
      const replacement = `export default function ${fnName}({\n${params}}: ${propsType}) {\n  const { t } = useTranslation(${tNs})\n${tcLine}`
      content = content.replace(HOOK_BLOCK_RE, replacement)
      hookFixed++
      console.log('fixed hooks:', rel)
    }

    // title={tc('...')}" or aria-label={tc('...')}"
    const quoteBefore = content
    content = content.replace(
      /(title|aria-label)=\{tc\(([^)]+)\)\}"/g,
      "$1={tc($2)}",
    )
    if (content !== quoteBefore) {
      quoteFixed++
      console.log('fixed quotes:', rel)
    }

    if (content !== original) {
      writeFileSync(path, content)
    }
  }

  console.log(`done: ${hookFixed} hook fixes, ${quoteFixed} quote fixes`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
