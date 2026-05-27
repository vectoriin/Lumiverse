import fs from 'fs'
import path from 'path'

function walk(d, a = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p, a)
    else if (p.endsWith('.tsx')) a.push(p.replace(/\\/g, '/'))
  }
  return a
}

const files = walk('src/components/panels')
const byFile = {}
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8')
  const hits = []
  const patterns = [
    [/(?:title|placeholder|aria-label|alt)=["']([^"']+)["']/g, 'attr'],
    [/label=["']([^"']+)["']/g, 'label'],
    [/toast\.(?:success|error)\(["']([^"']+)["']/g, 'toast'],
    [/FormField label=["']([^"']+)["']/g, 'form'],
    [/EditorSection[^>]*title=["']([^"']+)["']/g, 'section'],
    [/<span[^>]*>([A-Za-z][^<]{1,80})<\/span>/g, 'span'],
    [/<p>([^<]{3,80})<\/p>/g, 'p'],
    [/<button[^>]*>([^<{][^<]{2,60})<\/button>/g, 'btn'],
  ]
  for (const [re, kind] of patterns) {
    let m
    while ((m = re.exec(t)) !== null) {
      const s = m[1].trim()
      if (!s.includes('${') && !s.includes('{{') && !/^[a-z_]+$/.test(s)) hits.push({ kind, s })
    }
  }
  if (hits.length) byFile[f] = hits
}
fs.writeFileSync('scripts/panel-strings.json', JSON.stringify(byFile, null, 2))
console.log('files with hits', Object.keys(byFile).length)
