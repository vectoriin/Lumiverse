import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const p = join(import.meta.dir, '../src/components/panels/persona-browser/PersonaToolbar.tsx')
let c = readFileSync(p, 'utf8')
c = c.replace(
  /import \{\s*import \{ useTranslation \} from 'react-i18next'\s*\n\s*\n/,
  "import { useTranslation } from 'react-i18next'\nimport {\n",
)
writeFileSync(p, c)
console.log('ok')
