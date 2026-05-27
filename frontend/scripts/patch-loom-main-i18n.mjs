import fs from 'fs'

const p = 'src/components/panels/LoomBuilder.tsx'
let c = fs.readFileSync(p, 'utf8')

const reps = [
  ["addToast({ type: 'success', message: 'Default profile reapplied' })", "addToast({ type: 'success', message: lb('profiles.reapplied') })"],
  ["addToast({ type: 'info', message: 'Block states already match defaults' })", "addToast({ type: 'info', message: lb('profiles.alreadyDefault') })"],
  ['await duplicatePreset(activePresetId, `${activePreset.name} (Copy)`)', "await duplicatePreset(activePresetId, `${activePreset.name}${lb('preset.copySuffix')}`)"],
  ["toast.error(err.body?.error || err.message || 'Failed to export preset')", "toast.error(err.body?.error || err.message || lb('toast.exportFailed'))"],
  ["title={isSearchVisible ? 'Close prompt search' : 'Search prompts'}", "title={isSearchVisible ? lb('search.closeTitle') : lb('search.openTitle')}"],
  ["{isSearchVisible ? 'Close Search' : 'Search'}", "{isSearchVisible ? lb('search.close') : lb('search.search')}"],
  ['placeholder="Search prompt titles and content..."', "placeholder={lb('search.placeholder')}"],
  ['title="Clear search"', "title={lb('search.clearTitle')}"],
  ['? `${searchMatchCount} match${searchMatchCount === 1 ? \'\' : \'es\'}`', "? lb('search.matches', { count: searchMatchCount })"],
  [": 'Search prompt titles and content'}", ": lb('search.hint')}"],
  ['<span className={s.profileLabel}>Profiles</span>', "<span className={s.profileLabel}>{lb('profiles.label')}</span>"],
  ['title="Capture the current preset and block states as this preset\'s defaults"', "title={lb('profiles.captureTitle')}"],
  ['<Camera size={10} /> Capture', "<Camera size={10} /> {lb('profiles.capture')}"],
  ['title="Reapply this preset\'s default block states"', "title={lb('profiles.reapplyTitle')}"],
  ['<RotateCcw size={10} /> Default', "<RotateCcw size={10} /> {lb('profiles.default')}"],
  ['title="Clear default block states"', "title={lb('profiles.clearDefaultsTitle')}"],
  ["? 'No active character — open a chat first'", "? lb('profiles.noCharacter')"],
  ["? 'Capture defaults first'", "? lb('profiles.captureFirst')"],
  [": 'Bind the current preset and block states to this character'", ": lb('profiles.bindCharacter')"],
  ['title="Rebind the current preset and block states to this character"', "title={lb('profiles.rebindCharacter')}"],
  ['title="Remove character binding"', "title={lb('profiles.removeCharacter')}"],
  ['<Link size={10} /> Character', "<Link size={10} /> {lb('profiles.character')}"],
  ['<RotateCcw size={10} /> Character', "<RotateCcw size={10} /> {lb('profiles.character')}"],
  ["? 'No active chat — open a chat first'", "? lb('profiles.noChat')"],
  [": 'Bind the current preset and block states to this chat'", ": lb('profiles.bindChat')"],
  ['title="Rebind the current preset and block states to this chat"', "title={lb('profiles.rebindChat')}"],
  ['title="Remove chat binding"', "title={lb('profiles.removeChat')}"],
  ['<Link size={10} /> Chat', "<Link size={10} /> {lb('profiles.chat')}"],
  ['<RotateCcw size={10} /> Chat', "<RotateCcw size={10} /> {lb('profiles.chat')}"],
  ["? 'No active connection profile selected'", "? lb('profiles.noConnection')"],
  [": 'Bind the current preset and block states to this connection profile'", ": lb('profiles.bindConnection')"],
  ['title="Rebind the current preset and block states to this connection profile"', "title={lb('profiles.rebindConnection')}"],
  ['title="Remove connection profile binding"', "title={lb('profiles.removeConnection')}"],
  ['<Link size={10} /> Conn', "<Link size={10} /> {lb('profiles.conn')}"],
  ['<RotateCcw size={10} /> Conn', "<RotateCcw size={10} /> {lb('profiles.conn')}"],
  ["presetProfiles.activeSource === 'chat' ? 'CHAT' :", "presetProfiles.activeSource === 'chat' ? lb('profiles.sourceChat') :"],
  ["presetProfiles.activeSource === 'character' ? 'CHAR' :", "presetProfiles.activeSource === 'character' ? lb('profiles.sourceCharacter') :"],
  ["presetProfiles.activeSource === 'connection' ? 'CONN' : 'DEFAULT'", "presetProfiles.activeSource === 'connection' ? lb('profiles.sourceConnection') : lb('profiles.sourceDefault')"],
  ['<Settings2 size={14} /> Configure Prompt Variables', "<Settings2 size={14} /> {lb('actions.configureVariables')}"],
  ['<div className={s.emptyState}>Loading...</div>', "<div className={s.emptyState}>{lb('empty.loading')}</div>"],
  ['>No Preset Selected<', ">{lb('empty.noPresetTitle')}<"],
  ['>Create a new preset or select an existing one to start building.<', ">{lb('empty.noPresetHint')}<"],
  ['>No blocks yet<', ">{lb('empty.noBlocksTitle')}<"],
  ['>Add a prompt block or marker to get started.<', ">{lb('empty.noBlocksHint')}<"],
  ['>No matching prompts<', ">{lb('empty.noSearchTitle')}<"],
  ['>Search matches prompt titles and content within this preset.<', ">{lb('empty.noSearchHint')}<"],
  ['onClick={clearSearch}>Clear Search</button>', "onClick={clearSearch}>{lb('empty.clearSearch')}</button>"],
  ['<Plus size={14} /> Add Prompt <ChevronDown', "<Plus size={14} /> {lb('actions.addPrompt')} <ChevronDown"],
  ['<ChevronRight size={14} /> Add Category', "<ChevronRight size={14} /> {lb('actions.addCategory')}"],
  ['<Hash size={14} /> Add Marker <ChevronDown', "<Hash size={14} /> {lb('actions.addMarker')} <ChevronDown"],
  ["addBlock(createMarkerBlock('category', 'New Category'))", "addBlock(createMarkerBlock('category', lb('actions.newCategory')))"],
  ['title="Export Legacy Preset"', "title={lb('confirm.legacyExportTitle')}"],
  ['message="Lumiverse-specific macros', "message={lb('confirm.legacyExportMessage')}"],
  ['confirmText="Export Anyway"', "confirmText={lb('confirm.exportAnyway')}"],
  ['title="Delete Block"', "title={lb('confirm.deleteBlockTitle')}"],
  ['message="Are you sure you want to delete this block? This action cannot be undone."', "message={lb('confirm.deleteBlockMessage')}"],
  ['confirmText="Delete"', "confirmText={tc('actions.delete')}"],
]

for (const [a, b] of reps) {
  if (!c.includes(a)) console.warn('miss:', a.slice(0, 60))
  else c = c.split(a).join(b)
}

// Fix broken legacy export message if partial
c = c.replace(
  /message=\{lb\('confirm\.legacyExportMessage'\)\}[^}]*will not resolve[^"]*"/,
  "message={lb('confirm.legacyExportMessage')}",
)

fs.writeFileSync(p, c)
console.log('main patched')
