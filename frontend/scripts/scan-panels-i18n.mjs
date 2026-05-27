import fs from 'fs'
import path from 'path'

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p, a)
    else if (p.endsWith('.tsx')) a.push(p)
  }
  return a
}

const dir = 'src/components/panels'
const files = walk(dir)
console.log('count', files.length)

const found = new Set()
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8')
  const res = [
    /(?:title|placeholder|aria-label|alt)=["']([^"']{2,})["']/g,
    /toast\.(?:success|error)\(["']([^"']+)["']/g,
  ]
  for (const re of res) {
    let m
    while ((m = re.exec(t)) !== null) found.add(m[1])
  }
}
console.log([...found].sort().join('\n'))
console.log('---total', found.size)
