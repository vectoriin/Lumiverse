import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dir, '..')
const drawerSrc = readFileSync(join(root, 'src/lib/drawer-tab-registry.tsx'), 'utf8')
const settingsSrc = readFileSync(join(root, 'src/lib/settings-tab-registry.tsx'), 'utf8')
const cmdSrc = readFileSync(join(root, 'src/lib/commands.ts'), 'utf8')

type TabFields = {
  shortName: string
  tabName: string
  tabDescription: string
  tabHeaderTitle?: string
}

function extractTabs(src: string): Record<string, TabFields> {
  const tabs: Record<string, TabFields> = {}
  const re = /id: '([^']+)',[\s\S]*?shortName: '([^']*)',[\s\S]*?tabName: '([^']*)',[\s\S]*?tabDescription: '([^']*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const [, id, shortName, tabName, tabDescription] = m
    const headerMatch = src.slice(m.index, m.index + 800).match(/tabHeaderTitle: '([^']*)'/)
    tabs[id] = {
      shortName,
      tabName,
      tabDescription,
      ...(headerMatch ? { tabHeaderTitle: headerMatch[1] } : {}),
    }
  }
  return tabs
}

const drawer = extractTabs(drawerSrc)
const settingsTabs = extractTabs(settingsSrc)

const cmdItems: Record<string, { label: string; description: string }> = {}
const cmdRe = /id: '(action-[^']+)'[\s\S]*?label: '([^']*)',[\s\S]*?description: '([^']*)'/g
let cm: RegExpExecArray | null
while ((cm = cmdRe.exec(cmdSrc))) {
  cmdItems[cm[1]] = { label: cm[2], description: cm[3] }
}

for (const [id, t] of Object.entries(drawer)) {
  cmdItems[`panel-${id}`] = { label: t.tabName, description: t.tabDescription }
}
for (const [id, t] of Object.entries(settingsTabs)) {
  cmdItems[`settings-${id}`] = { label: t.tabName, description: t.tabDescription }
}

const panels = {
  drawer,
  connections: {
    imageGeneration: 'Image Generation',
    speechToText: 'Speech-to-Text',
    textToSpeech: 'Text-to-Speech',
  },
  group: 'Group',
}

const settings = {
  selectCategory: 'Select a settings category',
  tabs: settingsTabs,
  display: {
    modalWidth: {
      title: 'Modal Width',
      helper:
        'Constrain the maximum width of all modal dialogs. Affects settings, editors, and other popover panels.',
      full: 'Full',
      comfortable: 'Comfortable',
      compact: 'Compact',
      custom: 'Custom',
      maxWidth: 'MAX WIDTH (px)',
    },
    drawer: {
      title: 'Drawer',
      side: 'DRAWER SIDE',
      left: 'Left',
      right: 'Right',
      tabPosition: 'TAB POSITION',
    },
  },
}

const commands = {
  groups: {
    actions: 'Actions',
    panels: 'Panels',
    settings: 'Settings',
    extensions: 'Extensions',
  },
  items: cmdItems,
  palette: {
    search: 'Search commands…',
    clear: 'Clear search',
    aria: 'Command palette',
    noResults: 'No results for "{{query}}"',
    listAria: 'Commands',
  },
  confirm: {
    forkChat: {
      title: 'Fork Chat',
      message: 'Create a new branch from the latest message?',
      confirm: 'Fork',
    },
    deleteChat: {
      title: 'Delete Chat',
      message: 'Permanently delete this conversation?',
      confirm: 'Delete',
    },
  },
  toast: {
    failedRegenerate: 'Failed to regenerate',
    failedContinue: 'Failed to continue',
    importedCharacter: 'Imported {{name}}',
    failedImportCharacter: 'Failed to import character',
    failedForkChat: 'Failed to fork chat',
    copiedToClipboard: 'Copied to clipboard',
    failedCopy: 'Failed to copy',
    messageDeleted: 'Message deleted',
    failedDeleteMessage: 'Failed to delete message',
    messageHidden: 'Message hidden from AI context',
    messageVisible: 'Message visible to AI context',
    failedUpdateMessage: 'Failed to update message',
    dryRunFailed: 'Dry run failed',
    duplicatedCharacter: 'Duplicated {{name}}',
    failedDuplicateCharacter: 'Failed to duplicate character',
    chatDeleted: 'Chat deleted',
    failedDeleteChat: 'Failed to delete chat',
  },
  misc: {
    groupChat: 'Group Chat',
    character: 'Character',
  },
}

writeFileSync(join(root, 'src/locales/en/panels.json'), JSON.stringify(panels, null, 2))
writeFileSync(join(root, 'src/locales/en/settings.json'), JSON.stringify(settings, null, 2))
writeFileSync(join(root, 'src/locales/en/commands.json'), JSON.stringify(commands, null, 2))

console.log(
  `Generated: drawer=${Object.keys(drawer).length} settings=${Object.keys(settingsTabs).length} commands=${Object.keys(cmdItems).length}`,
)
