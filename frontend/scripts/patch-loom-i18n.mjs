import fs from 'fs'

const p = 'src/components/panels/LoomBuilder.tsx'
let c = fs.readFileSync(p, 'utf8')

if (!c.includes('function GenerationSettings({ samplerOverrides')) throw new Error('file mismatch')

c = c.replace(
  'function GenerationSettings({ samplerOverrides, customBody, connectionProfile, samplerParams, onSaveSamplers, onSaveCustomBody, onRefreshProfile }: GenerationSettingsProps) {\n  const [isExpanded',
  'function GenerationSettings({ samplerOverrides, customBody, connectionProfile, samplerParams, onSaveSamplers, onSaveCustomBody, onRefreshProfile }: GenerationSettingsProps) {\n  const { t } = useLb()\n  const [isExpanded',
)
c = c.replace(
  'function PromptBehaviorSettings({ promptBehavior, onSave }: { promptBehavior: any; onSave: (updates: Record<string, any>) => void }) {\n  const [isExpanded',
  'function PromptBehaviorSettings({ promptBehavior, onSave }: { promptBehavior: any; onSave: (updates: Record<string, any>) => void }) {\n  const { t } = useLb()\n  const [isExpanded',
)
c = c.replace(
  'function CompletionSettingsPanel({ completionSettings, onSave }: { completionSettings: any; onSave: (updates: Record<string, any>) => void }) {\n  const [isExpanded',
  'function CompletionSettingsPanel({ completionSettings, onSave }: { completionSettings: any; onSave: (updates: Record<string, any>) => void }) {\n  const { t } = useLb()\n  const [isExpanded',
)
c = c.replace(
  `function AdvancedSettingsPanel({
  advancedSettings,
  completionSettings,
  onSave,
  onSaveCompletion,
}: {
  advancedSettings: any
  completionSettings: any
  onSave: (updates: Record<string, any>) => void
  onSaveCompletion: (updates: Record<string, any>) => void
}) {
  const [isExpanded`,
  `function AdvancedSettingsPanel({
  advancedSettings,
  completionSettings,
  onSave,
  onSaveCompletion,
}: {
  advancedSettings: any
  completionSettings: any
  onSave: (updates: Record<string, any>) => void
  onSaveCompletion: (updates: Record<string, any>) => void
}) {
  const { t } = useLb()
  const [isExpanded`,
)
c = c.replace(
  'function ContextMeter() {\n  const breakdownCache',
  'function ContextMeter() {\n  const { t } = useLb()\n  const breakdownCache',
)

const reps = [
  ['title="Double-click to reset"', "title={t('sampler.doubleClickReset')}"],
  ['<span className={s.accordionTitle}>Samplers</span>', "<span className={s.accordionTitle}>{t('settings.samplers')}</span>"],
  ['<span className={s.samplerLabel}>Samplers</span>', "<span className={s.samplerLabel}>{t('settings.samplers')}</span>"],
  ['title="Reset all sampler overrides to defaults"', "title={t('settings.resetAll')}"],
  ['<RotateCcw size={8} /> Reset', "<RotateCcw size={8} /> {t('settings.reset')}"],
  ['No sampler overrides available for this provider.', "{t('settings.noSamplers')}"],
  ['label="Stream response"', "label={t('settings.streamResponse')}"],
  ['hint="Disable to receive the full response at once instead of token-by-token"', "hint={t('settings.streamHint')}"],
  ['<span className={s.samplerLabel}>Custom Body</span>', "<span className={s.samplerLabel}>{t('settings.customBody')}</span>"],
  ['label="Enabled"', "label={t('settings.enabled')}"],
  ['Keys are spread onto the request body.', "{t('settings.customBodyHint')}"],
  ['title="Restore default"', "title={t('settings.restoreDefault')}"],
  ['<RotateCcw size={7} /> Default', "<RotateCcw size={7} /> {t('sampler.default')}"],
  ['<span className={s.accordionTitle}>Prompt Behavior</span>', "<span className={s.accordionTitle}>{t('settings.promptBehavior')}</span>"],
  ['title={`${label} — Prompt Behavior`}', "title={t('settings.promptBehaviorTitle', { label })}"],
  ['<span className={s.accordionTitle}>Completion</span>', "<span className={s.accordionTitle}>{t('settings.completion')}</span>"],
  ['<span className={s.accordionTitle}>Advanced</span>', "<span className={s.accordionTitle}>{t('settings.advanced')}</span>"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Assistant Prefill</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.assistantPrefill')}</span>"],
  ['placeholder="Claude only — prepended to response"', "placeholder={t('settings.assistantPrefillPlaceholder')}"],
  ['<span className={s.settingsHint}>Claude only — prepended to assistant response</span>', "<span className={s.settingsHint}>{t('settings.assistantPrefillHint')}</span>"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Impersonation Prefill</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.impersonationPrefill')}</span>"],
  ['placeholder="Claude only — prefill when impersonating"', "placeholder={t('settings.impersonationPrefillPlaceholder')}"],
  ['<span className={s.settingsHint}>Claude only — prefill when impersonating</span>', "<span className={s.settingsHint}>{t('settings.impersonationPrefillHint')}</span>"],
  ['label="Continue Prefill"', "label={t('settings.continuePrefill')}"],
  ['label="Squash System Messages"', "label={t('settings.squashSystem')}"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Continue Postfix</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.continuePostfix')}</span>"],
  ['label="Use System Prompt"', "label={t('settings.useSystemPrompt')}"],
  ['label="Enable Web Search"', "label={t('settings.enableWebSearch')}"],
  ['label="Send Inline Media"', "label={t('settings.sendInlineMedia')}"],
  ['label="Enable Function Calling"', "label={t('settings.enableFunctionCalling')}"],
  ['label="Include Usage"', "label={t('settings.includeUsage')}"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Names in Messages</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.namesInMessages')}</span>"],
  ['Controls how speaker names are represented when formatting messages, including collapsed mode.', "{t('settings.namesHint')}"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Seed</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.seed')}</span>"],
  ['title="Set to random (-1)"', "title={t('settings.seedRandom')}"],
  ['<Dice1 size={7} /> Random', "<Dice1 size={7} /> {t('settings.random')}"],
  ['placeholder="-1 (random)"', "placeholder={t('settings.seedPlaceholder')}"],
  ['<span className={s.settingsHint}>-1 = random seed</span>', "<span className={s.settingsHint}>{t('settings.seedHint')}</span>"],
  ['<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>Custom Stop Strings</span>', "<span className={clsx(s.settingsFieldLabel, s.settingsFieldLabelDefault)}>{t('settings.customStopStrings')}</span>"],
  ['placeholder="Type and press Enter"', "placeholder={t('settings.stopPlaceholder')}"],
  ['Appended to the request stop sequences', "{t('settings.stopHint')}"],
  ['label="Collapse into single user message"', "label={t('settings.collapseMessages')}"],
  ['hint="Merges all prompt blocks and chat history into one user message. Use with &quot;Names in Messages: In Content&quot; for turn separation."', "hint={t('settings.collapseHint')}"],
  ['<span>Context: N/A</span>', "<span>{t('context.na')}</span>"],
  ['title="Click to view full prompt breakdown"', "title={t('context.breakdownTitle')}"],
  ["{total.toLocaleString()}{max > 0 ? ` / ${max.toLocaleString()} (${pct}%)` : ' tokens'}", "{total.toLocaleString()}{max > 0 ? ` / ${max.toLocaleString()} (${pct}%)` : t('tokens')}"],
]

for (const [a, b] of reps) {
  if (!c.includes(a)) console.warn('miss:', a.slice(0, 50))
  else c = c.split(a).join(b)
}

const pb = [
  ["label: 'Continue Nudge'", "label: t('settings.continueNudge')"],
  ["hint: 'Injected when continuing a response'", "hint: t('settings.continueNudgeHint')"],
  ["label: 'Empty Send Nudge'", "label: t('settings.emptySendNudge')"],
  ["hint: 'Injected when nudging for a fresh reply from an assistant-ending chat'", "hint: t('settings.emptySendNudgeHint')"],
  ["label: 'Impersonation Prompt'", "label: t('settings.impersonationPrompt')"],
  ["hint: 'Injected when impersonating the user'", "hint: t('settings.impersonationPromptHint')"],
  ["label: 'Group Nudge'", "label: t('settings.groupNudge')"],
  ["hint: 'Injected in group chats'", "hint: t('settings.groupNudgeHint')"],
  ["label: 'New Chat Separator'", "label: t('settings.newChatPrompt')"],
  ["hint: 'Inserted at conversation start'", "hint: t('settings.newChatPromptHint')"],
  ["label: 'New Group Chat Separator'", "label: t('settings.newGroupChatPrompt')"],
  ["hint: 'Inserted at group conversation start'", "hint: t('settings.newGroupChatPromptHint')"],
  ["label: 'Send If Empty'", "label: t('settings.sendIfEmpty')"],
  ["hint: 'Sent as a user message when the final assistant content is blank'", "hint: t('settings.sendIfEmptyHint')"],
]
for (const [a, b] of pb) c = c.split(a).join(b)

fs.writeFileSync(p, c)
console.log('done')
