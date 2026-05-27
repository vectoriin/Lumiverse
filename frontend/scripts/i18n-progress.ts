/**
 * Report i18n migration progress across frontend components.
 * Run: bun run scripts/i18n-progress.ts
 */
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const ROOT = join(import.meta.dir, '../src/components')

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.tsx')) out.push(p)
  }
  return out
}

const files = await walk(ROOT)
let migrated = 0
const pending: string[] = []

for (const f of files) {
  const rel = f.replace(join(import.meta.dir, '../') + '/', '').replace(/\\/g, '/')
  const content = await readFile(f, 'utf8')
  if (/useTranslation|i18n\.t\(/.test(content)) migrated++
  else pending.push(rel)
}

console.log(`Components: ${files.length} total, ${migrated} migrated, ${pending.length} pending`)
if (pending.length) {
  console.log('\nPending:')
  for (const p of pending.sort()) console.log(' ', p)
}
