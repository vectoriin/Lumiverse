import fs from 'node:fs'
import path from 'node:path'

function dupScan(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\n/)
  const stacks = [new Map()]
  const indentStack = [-1]
  const dups = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)"([^"]+)":/)
    if (!m) continue
    const indent = m[1].length
    const key = m[2]
    while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 1]) {
      stacks.pop()
      indentStack.pop()
    }
    const map = stacks[stacks.length - 1]
    if (map.has(key)) dups.push({ line: i + 1, key, prev: map.get(key), file })
    else map.set(key, i + 1)
    if (lines[i].trim().endsWith('{')) {
      stacks.push(new Map())
      indentStack.push(indent)
    }
  }
  return dups
}

const localeDir = path.join('src', 'locales')
let failed = false
for (const lang of ['en', 'zh']) {
  const dir = path.join(localeDir, lang)
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    const file = path.join(dir, name)
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      console.error(`${file}: invalid JSON — ${e.message}`)
      failed = true
      continue
    }
    const d = dupScan(file)
    if (d.length) {
      failed = true
      console.log(`${file} duplicate keys:`)
      for (const x of d) console.log(`  L${x.line} "${x.key}" (first L${x.prev})`)
    }
  }
}
if (!failed) console.log('All locale JSON files: valid, no duplicate keys detected')
process.exit(failed ? 1 : 0)
