import { useStore } from '@/store'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef, useState, useCallback, Fragment } from 'react'
import { Marked } from 'marked'
import clsx from 'clsx'
import {
  X, Plus, Trash2, Sparkles, ArrowRight, ArrowLeft, RefreshCw, Pencil, Check,
  Shuffle, PenLine, BookOpen, ShieldCheck, AlertTriangle,
  Layers, User, Smile, Image as ImageIcon, Copy, Download, MessageSquare,
  PanelsTopLeft, ChevronRight, ChevronDown, type LucideIcon,
} from 'lucide-react'
import type {
  WeaverSession, WeaverStage, WeaverCommittedFact, WeaverGap, WeaverResponseKind,
  WeaverBibleEntry, WeaverFieldDef, WeaverField, WeaverFieldKind,
} from '@/api/weaver'
import type { Character } from '@/types/api'
import { charactersApi } from '@/api/characters'
import { getCharacterAvatarUrlById, getCharacterAvatarLargeUrlById } from '@/lib/avatarUrls'
import { PortraitPane } from './PortraitPane'
import { sanitizeRichHtml } from '@/lib/richHtmlSanitizer'
import styles from './WeaverStudio.module.css'

const STAGES: WeaverStage[] = ['dream', 'readback', 'interview', 'bible', 'render', 'finalize']
const AUTOSAVE_MS = 700

const REACHABLE: WeaverStage[] = ['dream', 'readback', 'interview', 'bible', 'render', 'finalize']

const fieldMarked = new Marked({ gfm: true, breaks: true })

const LITERAL_MARKER_KINDS: ReadonlySet<WeaverFieldKind> = new Set(['alichat'])

function escapeAngleBrackets(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderFieldPreview(kind: WeaverFieldKind, text: string): string {
  const source = LITERAL_MARKER_KINDS.has(kind) ? escapeAngleBrackets(text) : text
  return sanitizeRichHtml(fieldMarked.parse(source, { async: false }) as string)
}

function estimateTokens(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

const ICONS: Record<string, LucideIcon> = {
  x: X, plus: Plus, trash: Trash2, sparkles: Sparkles, arrowRight: ArrowRight,
  arrowLeft: ArrowLeft, refresh: RefreshCw, pencil: Pencil, check: Check,
  shuffle: Shuffle, penLine: PenLine, bookOpen: BookOpen, shield: ShieldCheck,
  alert: AlertTriangle,
  layers: Layers, user: User, smile: Smile, image: ImageIcon, copy: Copy,
  download: Download, chat: MessageSquare, build: PanelsTopLeft,
  chevronRight: ChevronRight, chevronDown: ChevronDown,
}

export function Icon({ name, size = 16, className, spin }: { name: string; size?: number; className?: string; spin?: boolean }) {
  const C = ICONS[name]
  if (!C) return null
  return <C size={size} className={spin ? clsx(styles.spin, className) : className} />
}

interface BtnProps {
  variant?: 'primary' | 'ghost'
  icon?: string | null
  iconRight?: string | null
  spin?: boolean
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  title?: string
  onClick?: () => void
}
export function Btn({ variant = 'ghost', icon, iconRight, spin, children, className, disabled, title, onClick }: BtnProps) {
  return (
    <button
      type="button"
      className={clsx(styles.btn, variant === 'primary' ? styles.btnPrimary : styles.btnGhost, className)}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon && <Icon name={spin ? 'refresh' : icon} size={15} spin={spin} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  )
}

interface IconBtnProps {
  icon: string
  size?: number
  cls?: string
  spin?: boolean
  title: string
  disabled?: boolean
  onClick?: (e: React.MouseEvent) => void
  onMouseDown?: (e: React.MouseEvent) => void
}
export function IconBtn({ icon, size = 15, cls, spin, title, disabled, onClick, onMouseDown }: IconBtnProps) {
  return (
    <button
      type="button"
      className={clsx(styles.iconBtn, cls)}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <Icon name={icon} size={size} spin={spin} />
    </button>
  )
}

const TAG_KIND: Record<string, string> = {
  neutral: styles.tagNeutral,
  warning: styles.tagWarning,
  success: styles.tagSuccess,
}
function Tag({ kind = 'neutral', icon, children }: { kind?: 'neutral' | 'warning' | 'success'; icon?: string; children: React.ReactNode }) {
  return (
    <span className={clsx(styles.tag, TAG_KIND[kind])}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

const SDOT_CLS: Record<string, string> = {
  passed: styles.sdotPassed,
  flagged: styles.sdotFlagged,
  rendering: styles.sdotRendering,
  stale: styles.sdotStale,
  committed: styles.sdotCommitted,
  elicit: styles.sdotElicit,
  mixed: styles.sdotMixed,
  generate: styles.sdotGenerate,
  none: styles.sdotNone,
}
export function SDot({ status }: { status: string }) {
  return <span className={clsx(styles.sdot, SDOT_CLS[status] ?? styles.sdotNone)} />
}

function Band({ label, count, children }: { label: string; count?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className={styles.bandLabel}>
        <span>{label}</span>
        {count != null && <span className={styles.bandCount}>{count}</span>}
      </div>
      {children}
    </section>
  )
}

export function Placeholder({ icon, spin, children }: { icon: string; spin?: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.placeholder}>
      <Icon name={icon} size={26} spin={spin} />
      <p>{children}</p>
    </div>
  )
}

function StageRunning({ label, icon = 'refresh', onBack, backLabel }: { label: string; icon?: string; onBack: () => void; backLabel: string }) {
  return (
    <>
      <div className={styles.panel}>
        <Placeholder icon={icon} spin={icon === 'refresh'}>{label}</Placeholder>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{backLabel}</Btn>
        <div className={styles.spacer} />
      </div>
    </>
  )
}

interface FlagBandProps {
  subject?: string
  criteria?: string[]
  detail?: string
  fix?: string
  fixSteps?: string[]
  note: string
  inField?: boolean
  compact?: boolean
  action?: { label: string; onClick: () => void }
}
function FlagBand({ subject, criteria, detail, fix, fixSteps, note, inField, compact, action }: FlagBandProps) {
  const { t } = useTranslation('weaver')
  const title = subject
    ? <><b>{subject}</b> {t('render.flag.needsPass')}</>
    : t('render.flag.needsPass')

  if (compact) {
    return (
      <div className={clsx(styles.flagband, styles.flagbandCompact)}>
        <div className={styles.flagbandHead}>
          <Icon name="alert" size={16} />
          <span className={styles.flagbandTitle}>{title}</span>
          {criteria?.map((c) => <Tag key={c} kind="warning">{c}</Tag>)}
        </div>
        {detail && <div className={styles.flagbandBody}>{detail}</div>}
        <div className={styles.flagbandFoot}>
          <span className={styles.flagbandNoteInline}><Icon name="shield" size={13} /> {note}</span>
          {action && <Btn className={styles.btnTiny} iconRight="arrowRight" onClick={action.onClick}>{action.label}</Btn>}
        </div>
      </div>
    )
  }

  return (
    <div className={clsx(styles.flagband, inField && styles.flagbandInField)}>
      <div className={styles.flagbandHead}>
        <Icon name="alert" size={16} />
        <span className={styles.flagbandTitle}>{title}</span>
      </div>
      {criteria && criteria.length > 0 && (
        <div className={styles.flagbandCrit}>
          {criteria.map((c) => <Tag key={c} kind="warning">{c}</Tag>)}
        </div>
      )}
      {detail && <div className={styles.flagbandBody}>{detail}</div>}
      {fix && (
        <div className={styles.flagbandSection}>
          <div className={styles.flagbandSectionLabel}>{t('render.flag.whatToDo')}</div>
          <div className={styles.flagbandBody}>{fix}</div>
        </div>
      )}
      {fixSteps && fixSteps.length > 0 && (
        <div className={styles.flagbandSection}>
          <div className={styles.flagbandSectionLabel}>{t('render.flag.tryNext')}</div>
          <div className={clsx(styles.flagbandBody, styles.flagbandSteps)}>
            {fixSteps.map((s, i) => <div key={i}>· {s}</div>)}
          </div>
        </div>
      )}
      <div className={styles.flagbandNote}>
        <Icon name="shield" size={14} />
        <span>{note}</span>
      </div>
    </div>
  )
}

function FactLine({ value, empty, onChange, onDelete }: { value: string; empty?: boolean; onChange: (v: string) => void; onDelete?: () => void }) {
  const { t } = useTranslation('weaver')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.setSelectionRange(draft.length, draft.length)
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => { setEditing(false); if (draft !== value) onChange(draft) }

  if (editing) {
    return (
      <div className={styles.factEdit}>
        <div className={styles.factEditRow}>
          <textarea
            ref={ref}
            className={styles.factarea}
            rows={Math.max(2, Math.ceil((draft.length || 1) / 52))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
              if (e.key === 'Escape') { setDraft(value); setEditing(false) }
            }}
            onBlur={commit}
          />
          {onDelete && (
            <IconBtn icon="trash" cls={styles.sq28} title={t('readback.delete')} onMouseDown={(e) => { e.preventDefault(); onDelete() }} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(styles.factline, empty && styles.factlineEmpty)}
      tabIndex={0}
      onClick={() => { setDraft(value); setEditing(true) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setDraft(value); setEditing(true) } }}
    >
      {empty ? t('readback.emptyFact') : value}
      <span className={styles.factEditCue}><Icon name="pencil" size={13} /></span>
    </div>
  )
}

function EditableProse({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('weaver')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])
  const commit = () => { setEditing(false); if (draft !== value) onChange(draft) }

  if (editing) {
    return (
      <textarea
        ref={ref}
        className={styles.factarea}
        rows={Math.max(3, Math.ceil((draft.length || 1) / 64))}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
        }}
      />
    )
  }

  return (
    <div
      className={styles.factline}
      style={{ maxWidth: '70ch' }}
      tabIndex={0}
      onClick={() => { setDraft(value); setEditing(true) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setDraft(value); setEditing(true) } }}
    >
      <span className={styles.originProse}>{value || t('bible.emptyEntry')}</span>
      <span className={styles.factEditCue}><Icon name="pencil" size={13} /></span>
    </div>
  )
}

function OriginTag({ origin }: { origin: WeaverBibleEntry['origin'] }) {
  const { t } = useTranslation('weaver')
  if (origin === 'authored') return <Tag kind="neutral">{t('bible.origin.authored')}</Tag>
  if (origin === 'inferred') return <Tag kind="warning">{t('bible.origin.inferred')}</Tag>
  if (origin === 'established') return <Tag kind="success">{t('bible.origin.established')}</Tag>
  return null
}

export function WeaverStudio() {
  const { t } = useTranslation('weaver')
  const activeModal = useStore((s) => s.activeModal)
  const closeModal = useStore((s) => s.closeModal)

  const sessions = useStore((s) => s.weaverSessions)
  const activeId = useStore((s) => s.activeWeaverSessionId)
  const loadSessions = useStore((s) => s.loadWeaverSessions)
  const loadSlots = useStore((s) => s.loadWeaverSlots)

  const open = activeModal === 'weaver'
  const active = useMemo<WeaverSession | null>(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  )

  useEffect(() => {
    if (open) {
      void loadSessions()
      void loadSlots()
    }
  }, [open, loadSessions, loadSlots])

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className={styles.shell}>
        {active ? (
          <SessionWorkspace key={active.id} session={active} onClose={closeModal} />
        ) : (
          <>
            <header className={styles.hdr}>
              <div className={styles.hdrId}>
                <div className={styles.hdrEyebrow}>{t('title')}</div>
                <div className={styles.hdrTitle}>{t('subtitle')}</div>
              </div>
              <IconBtn icon="x" size={16} cls={styles.sq32} title={t('close')} onClick={closeModal} />
            </header>
            <div className={styles.panel}>
              <Placeholder icon="sparkles">{t('sessions.openFromPanel')}</Placeholder>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function useStartWeaverChat(sessionId: string) {
  const startChat = useStore((s) => s.startWeaverChat)
  const setActiveChat = useStore((s) => s.setActiveChat)
  const closeModal = useStore((s) => s.closeModal)
  const starting = useStore((s) => s.weaverStartingChat)
  const run = useCallback(async () => {
    try {
      const r = await startChat(sessionId)
      setActiveChat(r.chat.id, r.chat.character_id)
      closeModal()
    } catch {
    }
  }, [sessionId, startChat, setActiveChat, closeModal])
  return { run, starting }
}

function SessionWorkspace({ session, onClose }: { session: WeaverSession; onClose: () => void }) {
  const { t } = useTranslation('weaver')
  const isFinalized = session.status === 'finalized'
  const [viewMode, setViewMode] = useState<'pipeline' | 'dashboard'>(isFinalized ? 'dashboard' : 'pipeline')
  const [viewStage, setViewStage] = useState<WeaverStage>(
    REACHABLE.includes(session.stage) ? session.stage : 'dream',
  )

  const finalizeResult = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverFinalizeResult : null))
  const [character, setCharacter] = useState<Character | null>(finalizeResult?.character ?? null)

  useEffect(() => {
    setViewMode(isFinalized ? 'dashboard' : 'pipeline')
    setViewStage(REACHABLE.includes(session.stage) ? session.stage : 'dream')
  }, [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFinalized) return
    if (finalizeResult?.character) { setCharacter(finalizeResult.character); return }
    if (!session.character_id) return
    let alive = true
    void charactersApi.get(session.character_id).then((c) => { if (alive) setCharacter(c) }).catch(() => {})
    return () => { alive = false }
  }, [isFinalized, session.character_id, finalizeResult])

  const { run: startChat, starting } = useStartWeaverChat(session.id)
  const onExport = useCallback(() => {
    if (character) void charactersApi.exportCharacter(character.id, 'png', character.name)
  }, [character])

  const reachedIndex = STAGES.indexOf(session.stage)

  const goToStage = (stage: WeaverStage) => {
    const idx = STAGES.indexOf(stage)
    if (idx <= reachedIndex && REACHABLE.includes(stage)) setViewStage(stage)
  }

  const inDashboard = viewMode === 'dashboard' && isFinalized

  if (inDashboard) {
    return (
      <>
        <DashboardHeader
          character={character}
          starting={starting}
          onBuild={() => setViewMode('pipeline')}
          onExport={onExport}
          onStartChat={() => void startChat()}
          onClose={onClose}
        />
        <DashboardView
          session={session}
          character={character}
          starting={starting}
          onBuild={() => setViewMode('pipeline')}
          onStartChat={() => void startChat()}
          onCharacterUpdate={setCharacter}
        />
      </>
    )
  }

  return (
    <>
      <PipelineHeader session={session} onClose={onClose} />
      <nav className={styles.track} aria-label="stages">
        {STAGES.map((stage, index) => {
          const isReachable = REACHABLE.includes(stage) && index <= reachedIndex
          const isCurrent = stage === viewStage
          return (
            <Fragment key={stage}>
              {index > 0 && <span className={styles.trackSep} aria-hidden="true">›</span>}
              <button
                type="button"
                className={clsx(styles.trackStep, isCurrent ? styles.trackActive : isReachable ? styles.trackReachable : styles.trackLocked)}
                disabled={!isReachable && !isCurrent}
                onClick={() => goToStage(stage)}
                title={isReachable || isCurrent ? undefined : t('stages.comingSoon')}
              >
                {t(`stages.${stage}`)}
              </button>
            </Fragment>
          )
        })}
      </nav>

      {viewStage === 'dream' && (
        <DreamStage session={session} onAdvance={() => setViewStage('readback')} />
      )}
      {viewStage === 'readback' && (
        <ReadbackStage session={session} onBack={() => setViewStage('dream')} onContinue={() => setViewStage('interview')} />
      )}
      {viewStage === 'interview' && (
        <InterviewStage session={session} onBack={() => setViewStage('readback')} onContinue={() => setViewStage('bible')} />
      )}
      {viewStage === 'bible' && (
        <BibleStage session={session} onBack={() => setViewStage('interview')} onContinue={() => setViewStage('render')} />
      )}
      {viewStage === 'render' && (
        <RenderStage session={session} onBack={() => setViewStage('bible')} onContinue={() => setViewStage('finalize')} />
      )}
      {viewStage === 'finalize' && (
        <FinalizeStage session={session} onBack={() => setViewStage('render')} onOpenStudio={() => setViewMode('dashboard')} />
      )}
    </>
  )
}

function PipelineHeader({ session, onClose }: { session: WeaverSession; onClose: () => void }) {
  const { t } = useTranslation('weaver')
  const titleText = session.seed.text.trim().slice(0, 72) || t('sessions.untitled')
  return (
    <header className={styles.hdr}>
      <div className={styles.hdrId}>
        <div className={styles.hdrEyebrow}>{t('title')}</div>
        <div className={styles.hdrTitle} title={titleText}>{titleText}</div>
      </div>
      <IconBtn icon="x" size={16} cls={styles.sq32} title={t('close')} onClick={onClose} />
    </header>
  )
}

interface DashboardChromeProps {
  character: Character | null
  starting: boolean
  onBuild: () => void
  onExport: () => void
  onStartChat: () => void
  onClose: () => void
}
function DashboardHeader({ character, starting, onBuild, onExport, onStartChat, onClose }: DashboardChromeProps) {
  const { t } = useTranslation('weaver')
  const name = character?.name ?? t('finalize.untitled')
  const avatarUrl = character ? getCharacterAvatarUrlById(character.id, character.image_id) : null
  const tags = character?.tags ?? []
  return (
    <header className={styles.hdr}>
      <div className={styles.hdrAvatar}>
        {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div className={styles.hdrAvatarEmpty}><Icon name="user" size={18} /></div>}
      </div>
      <div className={styles.hdrId}>
        <div className={styles.dashEyebrow}>{t('dashboard.eyebrow')}</div>
        <div className={styles.hdrNameRow}>
          <span className={styles.hdrName}>{name}</span>
          {tags.slice(0, 2).map((tg) => <span key={tg} className={styles.inlineChip}>{tg}</span>)}
          <span className={styles.statusChip}><SDot status="passed" /> {t('dashboard.finalizedChip')}</span>
        </div>
      </div>
      <div className={styles.hdrActions}>
        <Btn icon="build" onClick={onBuild} title={t('dashboard.buildTitle')}>{t('dashboard.build')}</Btn>
        <Btn icon="download" disabled={!character} onClick={onExport} title={t('dashboard.exportTitle')}>{t('dashboard.export')}</Btn>
        <Btn variant="primary" icon={starting ? 'refresh' : 'chat'} spin={starting} disabled={starting || !character} onClick={onStartChat}>{t('dashboard.startChat')}</Btn>
        <IconBtn icon="x" size={16} cls={styles.sq32} title={t('close')} onClick={onClose} />
      </div>
    </header>
  )
}

const DASH_RAIL = [
  { id: 'overview', icon: 'layers', group: 'card' },
  { id: 'portrait', icon: 'user', group: 'img' },
  { id: 'expressions', icon: 'smile', group: 'img' },
  { id: 'scenes', icon: 'image', group: 'img' },
  { id: 'alternates', icon: 'copy', group: 'img' },
] as const
type DashKind = (typeof DASH_RAIL)[number]['id']

interface DashboardViewProps {
  session: WeaverSession
  character: Character | null
  starting: boolean
  onBuild: () => void
  onStartChat: () => void
  onCharacterUpdate: (character: Character) => void
}
function DashboardView({ session, character, starting, onBuild, onStartChat, onCharacterUpdate }: DashboardViewProps) {
  const { t } = useTranslation('weaver')
  const [kind, setKind] = useState<DashKind>('overview')
  const [portraitCount, setPortraitCount] = useState(0)
  const hasAvatar = Boolean(character && (character.image_id || character.avatar_path))

  const railTrailing = (id: DashKind) => {
    if (id === 'portrait') return (
      <>
        {portraitCount > 0 && <span className={styles.dashCount}>{portraitCount}</span>}
        <SDot status={hasAvatar ? 'committed' : 'none'} />
      </>
    )
    if (id === 'overview') return null
    return <span className={styles.dashCount}>0</span>
  }

  return (
    <>
      <div className={styles.dashBody}>
        <aside className={styles.dashRail}>
          {DASH_RAIL.map((r) => (
            <Fragment key={r.id}>
              {r.id === 'portrait' && (
                <>
                  <div className={styles.dashRailDivider} />
                  <div className={styles.dashRailSection}>{t('dashboard.rail.imagesGroup')}</div>
                </>
              )}
              <button
                type="button"
                className={clsx(styles.railItem, kind === r.id && styles.railItemActive)}
                onClick={() => setKind(r.id)}
              >
                <span className={styles.dashRailIcon}><Icon name={r.icon} size={17} /></span>
                <span className={styles.railName}>{t(`dashboard.rail.${r.id}`)}</span>
                {railTrailing(r.id)}
              </button>
            </Fragment>
          ))}
        </aside>

        <div className={styles.dashPane} key={kind}>
          {!character ? (
            <div className={styles.dashPaneInner}><Placeholder icon="refresh" spin>{t('dashboard.loadingCard')}</Placeholder></div>
          ) : kind === 'overview' ? (
            <OverviewPane character={character} onBuild={onBuild} />
          ) : kind === 'portrait' ? (
            <PortraitPane sessionId={session.id} character={character} onCharacterUpdate={onCharacterUpdate} onCount={setPortraitCount} />
          ) : (
            <VisualPane kind={kind} />
          )}
        </div>
      </div>

      {kind !== 'portrait' && (
        <div className={styles.footer}>
          <div className={styles.ftrContext}>
            <Icon name="check" size={14} />
            <span>{t('dashboard.readyContext')}</span>
          </div>
          <div className={styles.spacer} />
          <Btn variant="primary" icon={starting ? 'refresh' : 'chat'} spin={starting} disabled={starting || !character} onClick={onStartChat}>
            {t('dashboard.startChat')}
          </Btn>
        </div>
      )}
    </>
  )
}

function parseDescriptionBundle(desc: string): { tag: string; body: string }[] {
  if (!desc.trim()) return []
  const re = /\[([A-Z][A-Z ]*)\]/g
  const marks: { tag: string; start: number; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(desc)) !== null) marks.push({ tag: m[1].trim(), start: m.index, end: m.index + m[0].length })
  if (marks.length === 0) return [{ tag: '', body: desc.trim() }]
  return marks.map((mk, i) => ({
    tag: mk.tag,
    body: desc.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : undefined).trim(),
  }))
}

function formatFinalized(ts: number): string {
  if (!ts) return ''
  const ms = ts < 1e12 ? ts * 1000 : ts
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function OverviewPane({ character, onBuild }: { character: Character; onBuild: () => void }) {
  const { t } = useTranslation('weaver')
  const [provOpen, setProvOpen] = useState(false)
  const sections = useMemo(() => parseDescriptionBundle(character.description), [character.description])
  const core = sections.find((s) => s.tag === 'CORE')
  const essence = core ? (core.body.split('\n').map((l) => l.trim()).find(Boolean) ?? '') : ''
  const avatarUrl = getCharacterAvatarLargeUrlById(character.id, character.image_id)

  return (
    <div className={styles.dashPaneInner}>
      <div className={styles.ovStack}>
        <div className={styles.ovIdentity}>
          <div className={styles.ovAvatar}>
            {avatarUrl ? <img src={avatarUrl} alt={character.name} /> : <div className={styles.ovAvatarEmpty}><Icon name="user" size={30} /></div>}
          </div>
          <div className={styles.ovIdText}>
            <div className={styles.ovIdEyebrowRow}>
              <span className={styles.dashEyebrow}>{t('dashboard.overview.cardEyebrow')}</span>
              <span className={styles.statusChip}><SDot status="passed" /> {t('dashboard.finalizedChip')}</span>
            </div>
            <h1 className={styles.ovName}>{character.name}</h1>
            {character.tags.length > 0 && (
              <div className={styles.ovTags}>{character.tags.map((tg) => <span key={tg} className={styles.inlineChip}>{tg}</span>)}</div>
            )}
            <p className={styles.ovEssence}>{essence || t('dashboard.overview.noEssence')}</p>
            <button type="button" className={styles.ovEditLink} onClick={onBuild}>
              <Icon name="pencil" size={13} /> {t('dashboard.overview.editInBuild')}
            </button>
          </div>
        </div>

        {sections.length > 0 && (
          <Band label={t('dashboard.overview.description')}>
            {sections.map((s, i) => (
              <div className={styles.subfield} key={`${s.tag}-${i}`}>
                <div className={styles.subLabel}>
                  {s.tag || 'CORE'}
                  {s.tag === 'FORM' && <span className={styles.subHint}>{t('dashboard.overview.formConsult')}</span>}
                </div>
                <p className={styles.ovProse}>{s.tag === 'FORM' ? s.body.replace(/^\(consult[^)]*\)\s*/i, '') : s.body}</p>
              </div>
            ))}
          </Band>
        )}

        {character.personality.trim() && (
          <Band label={t('dashboard.overview.personality')}>
            <p className={styles.ovProse}>{character.personality}</p>
          </Band>
        )}
        {character.scenario.trim() && (
          <Band label={t('dashboard.overview.scenario')}>
            <p className={styles.ovProse}>{character.scenario}</p>
          </Band>
        )}
        {character.first_mes.trim() && (
          <Band label={t('dashboard.overview.firstMessage')}>
            <div className={styles.ovProse} dangerouslySetInnerHTML={{ __html: renderFieldPreview('voiced', character.first_mes) }} />
          </Band>
        )}
        {character.mes_example.trim() && (
          <Band label={t('dashboard.overview.exampleMessages')} count={t('dashboard.overview.exampleHint')}>
            <div className={styles.monoBlock} dangerouslySetInnerHTML={{ __html: renderFieldPreview('alichat', character.mes_example) }} />
          </Band>
        )}
        {character.alternate_greetings.length > 0 && (
          <Band label={t('dashboard.overview.altGreetings')} count={t('dashboard.overview.altGreetingsHint', { count: character.alternate_greetings.length })}>
            {character.alternate_greetings.map((g, i) => (
              <div className={styles.subfield} key={i}>
                <div className={styles.subLabel}>{t('dashboard.overview.greetingN', { n: i + 1 })}</div>
                <div className={styles.ovProse} dangerouslySetInnerHTML={{ __html: renderFieldPreview('voiced', g) }} />
              </div>
            ))}
          </Band>
        )}

        <section>
          <button type="button" className={styles.provHead} onClick={() => setProvOpen((o) => !o)}>
            <Icon name={provOpen ? 'chevronDown' : 'chevronRight'} size={14} />
            <span className={styles.railName} style={{ fontWeight: 600 }}>{t('dashboard.overview.provenance')}</span>
          </button>
          {provOpen && (
            <div className={styles.provRow}>
              <div className={styles.provItem}>
                <span className={styles.pvK}>{t('dashboard.overview.provFinalized')}</span>
                <span className={styles.pvV}>{formatFinalized(character.created_at)}</span>
              </div>
              <div className={styles.provItem}>
                <span className={styles.pvK}>{t('dashboard.overview.provPreset')}</span>
                <span className={styles.pvV}>{t('dashboard.overview.provPresetName')}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const VISUAL_PANE_ICON: Record<string, string> = { portrait: 'user', expressions: 'smile', scenes: 'image', alternates: 'copy' }
function VisualPane({ kind }: { kind: Exclude<DashKind, 'overview'> }) {
  const { t } = useTranslation('weaver')
  return (
    <div className={styles.visualPane}>
      <div className={styles.visualHead}>
        <h2 className={styles.visualTitle}>{t(`dashboard.rail.${kind}`)}</h2>
        <p className={styles.visualSub}>{t(`dashboard.visual.${kind}Sub`)}</p>
      </div>
      <div className={styles.canvasEmpty}>
        <div className={styles.ceFrame}><Icon name={VISUAL_PANE_ICON[kind]} size={22} /></div>
        <div className={styles.ceTitle}>{t(`dashboard.rail.${kind}`)}</div>
        <div className={styles.ceSub}>{t('dashboard.visual.comingSoon')}</div>
      </div>
    </div>
  )
}

function DreamStage({ session, onAdvance }: { session: WeaverSession; onAdvance: () => void }) {
  const { t } = useTranslation('weaver')
  const onSaveSeed = useStore((s) => s.updateWeaverSeed)
  const runReadback = useStore((s) => s.runWeaverReadback)
  const readbackRunning = useStore((s) => s.weaverReadbackRunning)
  const readbackError = useStore((s) => s.weaverReadbackError)

  const [text, setText] = useState(session.seed.text)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(session.seed.text)

  useEffect(() => {
    setText(session.seed.text)
    lastSaved.current = session.seed.text
    setSaveState('idle')
  }, [session.id, session.seed.text])

  const tokens = useMemo(() => estimateTokens(text), [text])

  const scheduleSave = useCallback(
    (next: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        if (next === lastSaved.current) return
        setSaveState('saving')
        try {
          await onSaveSeed(session.id, next)
          lastSaved.current = next
          setSaveState('saved')
        } catch {
          setSaveState('idle')
        }
      }, AUTOSAVE_MS)
    },
    [onSaveSeed, session.id],
  )

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const canRead = text.trim().length > 0 && !readbackRunning

  const handleRead = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (text !== lastSaved.current) {
      await onSaveSeed(session.id, text)
      lastSaved.current = text
    }
    await runReadback(session.id)
    if (!useStore.getState().weaverReadbackError) onAdvance()
  }

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('dream.heading')}</h2>
            <p className={styles.stageHelp}>{t('dream.help')}</p>
          </div>
        </div>
        {readbackError && <p className={styles.errorText}>{readbackError}</p>}
        <div className={styles.scroll} style={{ display: 'flex' }}>
          <div className={styles.dreamWrap}>
            <div className={styles.dreamGrid}>
              <div className={styles.dreamEdit}>
                <textarea
                  className={styles.field}
                  value={text}
                  placeholder={t('dream.placeholder')}
                  onChange={(e) => { setText(e.target.value); scheduleSave(e.target.value) }}
                />
                <div className={styles.dreamStatus}>
                  <span>{t('dream.tokens', { count: tokens })}</span>
                  <span>{saveState === 'saving' ? t('dream.saving') : saveState === 'saved' ? t('dream.saved') : ''}</span>
                </div>
              </div>
              <div className={styles.dreamRail}>
                <div className={styles.railGroupLabel}>{t('dream.nextTitle')}</div>
                <NextPipeline />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.spacer} />
        <Btn
          variant="primary"
          icon={readbackRunning ? 'refresh' : null}
          iconRight={readbackRunning ? null : 'arrowRight'}
          spin={readbackRunning}
          disabled={!canRead}
          onClick={() => void handleRead()}
        >
          {readbackRunning ? t('readback.running') : t('readback.run')}
        </Btn>
      </div>
    </>
  )
}

const PIPELINE_STEPS = ['readback', 'interview', 'bible', 'render'] as const
function NextPipeline() {
  const { t } = useTranslation('weaver')
  return (
    <div className={styles.pipeline}>
      {PIPELINE_STEPS.map((k, i) => (
        <div className={styles.pipelineStep} key={k}>
          <div className={styles.pipelineNum}>{i + 1}</div>
          <div>
            <div className={styles.pipelineName}>{t(`dream.pipeline.${k}.name`)}</div>
            <div className={styles.pipelineDesc}>{t(`dream.pipeline.${k}.desc`)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface ReadbackStageProps {
  session: WeaverSession
  onBack: () => void
  onContinue: () => void
}
function ReadbackStage({ session, onBack, onContinue }: ReadbackStageProps) {
  const { t } = useTranslation('weaver')
  const slots = useStore((s) => s.weaverSlots)
  const extraction = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverExtraction : null))
  const loadExtraction = useStore((s) => s.loadWeaverExtraction)
  const saveExtraction = useStore((s) => s.saveWeaverExtraction)
  const runReadback = useStore((s) => s.runWeaverReadback)
  const readbackRunning = useStore((s) => s.weaverReadbackRunning)

  const [facts, setFacts] = useState<WeaverCommittedFact[]>([])
  const [gaps, setGaps] = useState<WeaverGap[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { void loadExtraction(session.id) }, [session.id, loadExtraction])

  useEffect(() => {
    setFacts(extraction?.committed_facts ?? [])
    setGaps(extraction?.gaps ?? [])
    setDirty(false)
  }, [extraction])

  const labelFor = (slotId: string) => slots.find((s) => s.id === slotId)?.label ?? slotId
  const factsBySlot = useMemo(() => {
    const m = new Map<string, number[]>()
    facts.forEach((f, i) => { const arr = m.get(f.slot) ?? []; arr.push(i); m.set(f.slot, arr) })
    return m
  }, [facts])

  const partsOf = (slotId: string): { id: string; label: string; fill: string }[] => {
    const s = slots.find((sl) => sl.id === slotId)
    if (!s) return []
    if (s.parts && s.parts.length > 0) return s.parts
    return [{ id: s.id, label: s.label, fill: s.fill }]
  }
  const gapClass = (slotId: string): 'elicit' | 'generate' | 'mixed' => {
    const ps = partsOf(slotId)
    const hasElicit = ps.some((p) => p.fill === 'elicit')
    const hasGenerate = ps.some((p) => p.fill === 'generate')
    return hasElicit && hasGenerate ? 'mixed' : hasElicit ? 'elicit' : 'generate'
  }
  const partLabels = (slotId: string, fill: string) =>
    partsOf(slotId).filter((p) => p.fill === fill).map((p) => p.label).join(', ')
  const isOptional = (slotId: string) => slots.find((s) => s.id === slotId)?.optional === true

  const slotStatus = (slotId: string): string => {
    const idxs = factsBySlot.get(slotId) ?? []
    if (idxs.some((i) => facts[i].fact.trim())) return 'committed'
    return gapClass(slotId)
  }

  const factSlots = useMemo(
    () => slots.filter((s) => (factsBySlot.get(s.id) ?? []).length > 0),
    [slots, factsBySlot],
  )
  const askGaps = useMemo(() => gaps.filter((g) => gapClass(g.slot) === 'elicit'), [gaps, slots])
  const mixedGaps = useMemo(() => gaps.filter((g) => gapClass(g.slot) === 'mixed'), [gaps, slots])
  const writeGaps = useMemo(() => gaps.filter((g) => gapClass(g.slot) === 'generate'), [gaps, slots])

  const updateFact = (index: number, value: string) => {
    setFacts((prev) => prev.map((f, i) => (i === index ? { ...f, fact: value, source: 'user' } : f)))
    setDirty(true)
  }
  const deleteFact = (index: number) => {
    setFacts((prev) => prev.filter((_, i) => i !== index))
    setDirty(true)
  }
  const addFact = (slot: string) => {
    setFacts((prev) => [...prev, { slot, fact: '', source: 'user' as const }])
    setGaps((prev) => prev.filter((g) => g.slot !== slot))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveExtraction(session.id, { committed_facts: facts.filter((f) => f.fact.trim()), gaps })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  if (readbackRunning && !extraction) {
    return <StageRunning label={t('readback.running')} onBack={onBack} backLabel={t('readback.backToDream')} />
  }

  if (!extraction) {
    return (
      <>
        <div className={styles.panel}>
          <Placeholder icon="alert">{t('readback.none')}</Placeholder>
        </div>
        <div className={styles.footer}>
          <Btn icon="arrowLeft" onClick={onBack}>{t('readback.backToDream')}</Btn>
          <div className={styles.spacer} />
        </div>
      </>
    )
  }

  const miniFor = (status: string) =>
    status === 'committed'
      ? <span className={clsx(styles.railMini, styles.railMiniCommitted)}>{t('readback.miniCommitted')}</span>
      : status === 'elicit'
        ? <span className={clsx(styles.railMini, styles.railMiniElicit)}>{t('readback.miniInterview')}</span>
        : status === 'mixed'
          ? <span className={clsx(styles.railMini, styles.railMiniMixed)}>{t('readback.miniMixed')}</span>
          : <span className={clsx(styles.railMini, styles.railMiniWrite)}>{t('readback.miniWrite')}</span>

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('readback.heading')}</h2>
            <p className={styles.stageHelp}>{t('readback.intro')}</p>
          </div>
        </div>
        <div className={styles.scroll}>
          <div className={styles.work}>
            <div className={styles.workRail}>
              <div>
                <div className={styles.railGroupLabel}>{t('readback.spineRail', { count: slots.length })}</div>
                <div className={styles.railKey}>
                  <span className={styles.railKeyRow}><span className={clsx(styles.sdot, styles.sdotCommitted)} /> {t('readback.keyCommitted')}</span>
                  <span className={styles.railKeyRow}><span className={clsx(styles.sdot, styles.sdotElicit)} /> {t('readback.keyAsked')}</span>
                  <span className={styles.railKeyRow}><span className={clsx(styles.sdot, styles.sdotMixed)} /> {t('readback.keyMixed')}</span>
                  <span className={styles.railKeyRow}><span className={clsx(styles.sdot, styles.sdotGenerate)} /> {t('readback.keyWrites')}</span>
                </div>
                <div className={styles.railList} style={{ marginTop: 12 }}>
                  {slots.map((s) => {
                    const st = slotStatus(s.id)
                    return (
                      <div key={s.id} className={styles.railItem} style={{ cursor: 'default' }}>
                        <span className={styles.railMarker}><SDot status={st} /></span>
                        <span className={styles.railName}>{s.label}</span>
                        {miniFor(st)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={styles.workMain}>
              <Band label={t('readback.fromDreamTitle')} count={t('readback.slotCount', { count: factSlots.length })}>
                <div className={styles.ledger}>
                  {factSlots.map((slot) => (
                    <div className={styles.ledgerRow} key={slot.id}>
                      <div className={clsx(styles.ledgerCell, styles.ledgerLabel)}>
                        <span>{slot.label}</span>
                        <IconBtn icon="plus" size={14} cls={styles.sq22} title={t('readback.addFact')} onClick={() => addFact(slot.id)} />
                      </div>
                      <div className={clsx(styles.ledgerCell, styles.ledgerContent)}>
                        {(factsBySlot.get(slot.id) ?? []).map((i) => (
                          <FactLine key={i} value={facts[i].fact} empty={!facts[i].fact} onChange={(v) => updateFact(i, v)} onDelete={() => deleteFact(i)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Band>

              {(askGaps.length > 0 || mixedGaps.length > 0 || writeGaps.length > 0) && (
                <Band label={t('readback.nextTitle')}>
                  {askGaps.length > 0 && (
                    <div className={styles.chipGroup}>
                      <p className={styles.chipGroupLabel}>{t('readback.willAskGroup')}</p>
                      <div className={styles.chips}>
                        {askGaps.map((g) => (
                          <button key={g.slot} className={styles.chip} title={t('readback.pinYourself')} onClick={() => addFact(g.slot)}>
                            <Icon name="penLine" size={13} className={styles.chipIcn} />{labelFor(g.slot)}
                            {isOptional(g.slot) && <span className={clsx(styles.tag, styles.tagNeutral)}>{t('readback.detectedTag')}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {mixedGaps.length > 0 && (
                    <div className={styles.chipGroup}>
                      <p className={styles.chipGroupLabel}>{t('readback.willMixedGroup')}</p>
                      <div className={styles.mixedList}>
                        {mixedGaps.map((g) => (
                          <button key={g.slot} className={styles.mixedRow} title={t('readback.pinYourself')} onClick={() => addFact(g.slot)}>
                            <span className={styles.mixedRowHead}>
                              <Icon name="penLine" size={13} className={styles.chipIcn} />{labelFor(g.slot)}
                              {isOptional(g.slot) && <span className={clsx(styles.tag, styles.tagNeutral)}>{t('readback.detectedTag')}</span>}
                            </span>
                            <span className={styles.mixedRowParts}>
                              <span className={styles.mixedYou}>{t('readback.mixedYou', { parts: partLabels(g.slot, 'elicit') })}</span>
                              <span className={styles.mixedDot}>·</span>
                              <span className={styles.mixedWeaver}>{t('readback.mixedWeaver', { parts: partLabels(g.slot, 'generate') })}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {writeGaps.length > 0 && (
                    <div className={styles.chipGroup}>
                      <p className={styles.chipGroupLabel}>{t('readback.willWriteGroup')}</p>
                      <div className={styles.chips}>
                        {writeGaps.map((g) => (
                          <button key={g.slot} className={styles.chip} title={t('readback.pinYourself')} onClick={() => addFact(g.slot)}>
                            <Icon name="pencil" size={13} className={styles.chipIcn} />{labelFor(g.slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Band>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{t('readback.backToDream')}</Btn>
        <Btn icon="refresh" onClick={() => void runReadback(session.id)} disabled={readbackRunning} title={t('readback.rerunHint')}>{t('readback.rerun')}</Btn>
        <div className={styles.spacer} />
        <Btn
          variant="primary"
          iconRight="arrowRight"
          disabled={saving}
          onClick={async () => { if (dirty) await handleSave(); onContinue() }}
        >
          {saving ? t('readback.saving') : t('readback.continue')}
        </Btn>
      </div>
    </>
  )
}

function InterviewStage({ session, onBack, onContinue }: { session: WeaverSession; onBack: () => void; onContinue: () => void }) {
  const { t } = useTranslation('weaver')
  const slots = useStore((s) => s.weaverSlots)
  const owns = useStore((s) => s.weaverStateSessionId === session.id)
  const interview = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverInterview : null))
  const question = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverQuestion : null))
  const loading = useStore((s) => s.weaverQuestionLoading)
  const error = useStore((s) => s.weaverInterviewError)
  const loadInterview = useStore((s) => s.loadWeaverInterview)
  const nextQuestion = useStore((s) => s.nextWeaverQuestion)
  const answerQuestion = useStore((s) => s.answerWeaverQuestion)
  const beginInterview = useStore((s) => s.beginWeaverInterview)
  const completeInterview = useStore((s) => s.completeWeaverInterview)
  const resetInterview = useStore((s) => s.resetWeaverInterview)

  const [selected, setSelected] = useState<number[]>([])
  const [steer, setSteer] = useState('')
  const [typed, setTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { void loadInterview(session.id) }, [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (owns && interview?.phase === 'active' && !interview.no_gaps_remaining && !question && !loading && !error) {
      void nextQuestion(session.id)
    }
  }, [owns, interview?.phase, interview?.no_gaps_remaining, question, loading, error]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSelected([]); setSteer(''); setTyped('') }, [question])
  const targetLabel = (slot: string, part: string) => {
    const s = slots.find((sl) => sl.id === slot)
    if (part && part !== slot && s?.parts) {
      const p = s.parts.find((pp) => pp.id === part)
      if (p) return `${s.label} · ${p.label}`
    }
    return s?.label ?? slot
  }

  const answeredCount = interview?.answered.length ?? 0
  const remainingCount = interview?.remaining_targets.length ?? 0
  const total = answeredCount + remainingCount

  const toggle = (i: number) => setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].slice(-2)))

  const submit = async (kind: WeaverResponseKind, content: string, steerText?: string) => {
    if (!question || !content.trim()) return
    setSubmitting(true)
    try {
      await answerQuestion(session.id, { slot: question.slot, part: question.part, axis: question.axis, kind, content: content.trim(), steer: steerText })
    } finally {
      setSubmitting(false)
    }
  }

  const usePick = () => {
    if (!question) return
    if (selected.length === 1) {
      void submit('pick', question.options[selected[0]].content)
    } else if (selected.length === 2) {
      const [a, b] = selected.map((i) => question.options[i])
      void submit('blend', `${a.content}\n\nBlended with: ${b.content}`, `blended "${a.caption}" with "${b.caption}"`)
    }
  }

  if (owns && interview?.phase === 'pending') {
    const nothingToAsk = interview.no_gaps_remaining
    return (
      <>
        <div className={styles.panel}>
          <div className={styles.stageHead}>
            <div className={styles.stageHeadL}>
              <h2 className={styles.stageH}>{t('interview.heading')}</h2>
              <p className={styles.stageHelp}>{nothingToAsk ? t('interview.introNoGaps') : t('interview.intro')}</p>
            </div>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
        <div className={styles.footer}>
          <Btn icon="arrowLeft" onClick={onBack}>{t('interview.backToReadback')}</Btn>
          <div className={styles.spacer} />
          {nothingToAsk ? (
            <Btn variant="primary" iconRight="arrowRight" disabled={loading} onClick={() => void completeInterview(session.id)}>{t('interview.skipAhead')}</Btn>
          ) : (
            <Btn variant="primary" icon={loading ? 'refresh' : null} iconRight={loading ? null : 'arrowRight'} spin={loading} disabled={loading} onClick={() => void beginInterview(session.id)}>
              {loading ? t('interview.thinking') : t('interview.begin')}
            </Btn>
          )}
        </div>
      </>
    )
  }

  if (owns && interview?.phase === 'complete' && !loading) {
    return (
      <>
        <div className={styles.panel}>
          <Placeholder icon="check">{t('interview.doneCount', { count: answeredCount })}</Placeholder>
        </div>
        <div className={styles.footer}>
          <Btn icon="arrowLeft" onClick={onBack}>{t('interview.backToReadback')}</Btn>
          <Btn icon="refresh" onClick={() => void resetInterview(session.id)} title={t('interview.rerunHint')}>{t('interview.rerun')}</Btn>
          <div className={styles.spacer} />
          <Btn variant="primary" iconRight="arrowRight" onClick={onContinue}>{t('interview.continueToBible')}</Btn>
        </div>
      </>
    )
  }

  if (loading) {
    return <StageRunning label={t('interview.thinking')} onBack={onBack} backLabel={t('interview.backToReadback')} />
  }

  if (!owns || !interview) {
    return <StageRunning label={t('interview.loading')} onBack={onBack} backLabel={t('interview.backToReadback')} />
  }

  const current = question ? { slot: question.slot, part: question.part } : null
  const remaining = (interview?.remaining_targets ?? []).filter(
    (t) => !(current && t.slot === current.slot && t.part === current.part),
  )
  const railRows: { slot: string; part: string; kind: 'answered' | 'current' | 'upcoming' }[] = [
    ...(interview?.answered ?? []).map((a) => ({ slot: a.slot, part: a.part, kind: 'answered' as const })),
    ...(current ? [{ slot: current.slot, part: current.part, kind: 'current' as const }] : []),
    ...remaining.map((t) => ({ slot: t.slot, part: t.part, kind: 'upcoming' as const })),
  ]

  const canFinish = answeredCount > 0 || (interview?.no_gaps_remaining ?? false)
  let primaryLabel: string | null = null
  let primaryIcon = 'check'
  let onPrimary: () => void = () => {}
  if (selected.length === 2) { primaryLabel = t('interview.blend'); primaryIcon = 'shuffle'; onPrimary = usePick }
  else if (selected.length === 1) { primaryLabel = t('interview.use'); primaryIcon = 'check'; onPrimary = usePick }
  else if (canFinish) { primaryLabel = t('interview.finish'); primaryIcon = 'check'; onPrimary = () => void completeInterview(session.id) }

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('interview.heading')}</h2>
            <p className={styles.stageHelp}>{t('interview.activeHelp')}</p>
          </div>
          {total > 0 && <div className={styles.prog}>{t('interview.progress', { done: answeredCount, total })}</div>}
        </div>
        <div className={styles.scroll}>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.work}>
            <div className={styles.workRail}>
              <div>
                <div className={styles.railGroupLabel}>{t('interview.questionsRail')}</div>
                <div className={styles.railList}>
                  {railRows.map((r, i) => (
                    <div key={`${r.slot}:${r.part}-${i}`} className={clsx(styles.railItem, r.kind === 'current' && styles.railItemActive)} style={{ cursor: 'default' }}>
                      <span className={styles.railMarker}>
                        {r.kind === 'answered'
                          ? <Icon name="check" size={14} className={styles.critIcnPass} />
                          : r.kind === 'current'
                            ? <span className={clsx(styles.sdot, styles.sdotElicit)} />
                            : <span className={clsx(styles.sdot, styles.sdotNone)} />}
                      </span>
                      <span className={clsx(styles.railName, r.kind === 'upcoming' && styles.railNameDim)}>{targetLabel(r.slot, r.part)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.railNote}>
                  {interview?.no_gaps_remaining ? t('interview.allAnswered') : t('interview.answerOrder')}
                </div>
              </div>
            </div>

            <div className={styles.workMain}>
              {question ? (
                <div>
                  <div className={styles.slotEyebrow}>{targetLabel(question.slot, question.part)}</div>
                  <h3 className={styles.axisName}>{question.axis.name}</h3>
                  {question.axis.description && <p className={styles.axisDesc}>{question.axis.description}</p>}
                  <div className={styles.opts}>
                    {question.options.map((opt, i) => {
                      const isSel = selected.includes(i)
                      return (
                        <button key={i} className={clsx(styles.optCard, isSel && styles.optCardSel)} onClick={() => toggle(i)}>
                          <span className={styles.optCheck}><Icon name="check" size={13} /></span>
                          <span className={styles.optBody}>
                            {opt.caption && <div className={styles.optCaption}>{opt.caption}</div>}
                            <div className={styles.optContent}>{opt.content}</div>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className={styles.tools}>
                    <div className={styles.toolRow}>
                      <input
                        className={styles.toolin}
                        value={steer}
                        placeholder={t('interview.steerPlaceholder')}
                        onChange={(e) => setSteer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && steer.trim()) void nextQuestion(session.id, steer.trim()) }}
                      />
                      <Btn className={styles.btnTiny} icon="refresh" disabled={!steer.trim() || submitting} onClick={() => void nextQuestion(session.id, steer.trim())}>{t('interview.respread')}</Btn>
                    </div>
                    <div className={styles.toolRow}>
                      <input
                        className={styles.toolin}
                        value={typed}
                        placeholder={t('interview.typePlaceholder')}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && typed.trim()) void submit('typed', typed.trim()) }}
                      />
                      <Btn className={styles.btnTiny} icon="penLine" disabled={!typed.trim() || submitting} onClick={() => void submit('typed', typed.trim())}>{t('interview.useOwn')}</Btn>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <FlagBand
                  inField
                  subject={t('interview.generateFailedSubject')}
                  detail={t('interview.generateFailedBody')}
                  note={t('interview.generateFailedNote')}
                />
              ) : (
                <Placeholder icon="check">{t('interview.allAnswered')}</Placeholder>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{t('interview.backToReadback')}</Btn>
        {!question && error && (
          <Btn icon="refresh" disabled={loading} onClick={() => void nextQuestion(session.id)}>{t('interview.retry')}</Btn>
        )}
        <div className={styles.spacer} />
        {primaryLabel && <Btn variant="primary" icon={primaryIcon} disabled={submitting} onClick={onPrimary}>{primaryLabel}</Btn>}
      </div>
    </>
  )
}

function BibleStage({ session, onBack, onContinue }: { session: WeaverSession; onBack: () => void; onContinue: () => void }) {
  const { t } = useTranslation('weaver')
  const slots = useStore((s) => s.weaverSlots)
  const owns = useStore((s) => s.weaverStateSessionId === session.id)
  const bible = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverBible : null))
  const running = useStore((s) => s.weaverBibleRunning)
  const error = useStore((s) => s.weaverBibleError)
  const loadBible = useStore((s) => s.loadWeaverBible)
  const synthesize = useStore((s) => s.synthesizeWeaverBible)
  const gate = useStore((s) => s.gateWeaverBible)
  const saveBible = useStore((s) => s.saveWeaverBible)

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<WeaverBibleEntry[]>([])
  const [brief, setBrief] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    void loadBible(session.id).finally(() => setLoading(false))
  }, [session.id, loadBible])

  useEffect(() => {
    if (bible) {
      setEntries(bible.spine.entries)
      setBrief(bible.spine.brief)
      setDirty(false)
    }
  }, [bible])

  const labelFor = (slotId: string) => slots.find((s) => s.id === slotId)?.label ?? slotId
  const partLabelFor = (slotId: string, partId: string) =>
    slots.find((s) => s.id === slotId)?.parts?.find((p) => p.id === partId)?.label ?? partId

  const editEntry = (slot: string, value: string) => {
    setEntries((prev) => prev.map((e) => (e.slot === slot ? { ...e, content: value } : e)))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveBible(session.id, { entries, brief })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !bible) {
    return (
      <>
        <div className={styles.panel}><Placeholder icon="refresh" spin>{t('bible.building')}</Placeholder></div>
        <div className={styles.footer}><Btn icon="arrowLeft" onClick={onBack}>{t('bible.backToInterview')}</Btn><div className={styles.spacer} /></div>
      </>
    )
  }

  if (running && !bible) {
    return <StageRunning label={t('bible.building')} icon="bookOpen" onBack={onBack} backLabel={t('bible.backToInterview')} />
  }

  if (owns && !bible) {
    return (
      <>
        <div className={styles.panel}>
          <div className={styles.stageHead}>
            <div className={styles.stageHeadL}>
              <h2 className={styles.stageH}>{t('bible.introTitle')}</h2>
              <p className={styles.stageHelp}>{t('bible.intro')}</p>
            </div>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
        <div className={styles.footer}>
          <Btn icon="arrowLeft" onClick={onBack}>{t('bible.backToInterview')}</Btn>
          <div className={styles.spacer} />
          <Btn variant="primary" icon="bookOpen" disabled={running} onClick={() => void synthesize(session.id)}>{t('bible.build')}</Btn>
        </div>
      </>
    )
  }

  if (!bible) return null

  const edited = dirty || bible.status === 'pending'
  const passed = bible.status === 'gated'
  const failedCrit = bible.gate ? bible.gate.criteria.filter((c) => !c.passed) : []
  const flagged = bible.status === 'flagged' && !edited

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('bible.heading')}</h2>
            <p className={styles.stageHelp}>{t('bible.help')}</p>
          </div>
          <div className={styles.spend}>{t('bible.spend', { count: bible.token_usage.total_tokens, calls: bible.token_usage.calls })}</div>
        </div>
        <div className={styles.scroll}>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.work}>
            <div className={styles.workRail}>
              <div>
                <div className={styles.railGroupLabel}>{t('bible.gateTitle')}</div>
                <div className={clsx(styles.gateStatus, edited ? styles.gateStatusEdited : passed ? styles.gateStatusPass : styles.gateStatusFlagged)}>
                  {edited ? <><Icon name="pencil" size={16} /> {t('bible.gatePending')}</>
                    : passed ? <><Icon name="shield" size={16} /> {t('bible.gatePassed')}</>
                    : <><Icon name="alert" size={16} /> {t('bible.gateFlagged')}</>}
                </div>
                {edited ? (
                  <p className={styles.gateSummary}>{t('bible.gateEditedHint')}</p>
                ) : bible.gate ? (
                  <p className={styles.gateSummary}>
                    {failedCrit.length > 0
                      ? t('bible.gateScored', { total: bible.gate.criteria.length, fail: failedCrit.length })
                      : t('bible.gateAllPass')}
                  </p>
                ) : null}
                {!edited && bible.gate && (
                  <div className={styles.critList}>
                    {bible.gate.criteria.map((c) => (
                      <div className={styles.crit} key={c.key}>
                        <Icon name={c.passed ? 'check' : 'alert'} size={15} className={clsx(styles.critIcn, c.passed ? styles.critIcnPass : styles.critIcnFail)} />
                        <div className={styles.critL}>
                          <div className={styles.critLabel}>{c.label}</div>
                          {c.note && <div className={styles.critNote}>{c.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.workMain}>
              {flagged && (
                <FlagBand
                  subject={t('bible.flagSubject')}
                  criteria={failedCrit.map((c) => c.label)}
                  detail={bible.gate?.summary}
                  fix={failedCrit.length > 0
                    ? t('bible.flagFix', { criteria: failedCrit.map((c) => c.label).join(', ') })
                    : t('bible.flagFixGeneric')}
                  note={t('render.noRetryNote')}
                />
              )}
              <Band label={t('bible.briefTitle')}>
                <EditableProse value={brief} onChange={(v) => { setBrief(v); setDirty(true) }} />
              </Band>
              <Band label={t('bible.spineTitle')} count={t('readback.slotCount', { count: entries.length })}>
                <div className={styles.ledger}>
                  {entries.map((entry) => (
                    <div className={styles.ledgerRow} key={entry.slot}>
                      <div className={clsx(styles.ledgerCell, styles.ledgerLabel)}><span>{labelFor(entry.slot)}</span></div>
                      <div className={clsx(styles.ledgerCell, styles.ledgerContent)}>
                        {entry.parts && entry.parts.length > 0 ? (
                          <div className={styles.partProvenance}>
                            {entry.parts.map((p) => (
                              <span className={styles.partProvItem} key={p.id}>
                                <span className={styles.partProvLabel}>{partLabelFor(entry.slot, p.id)}</span>
                                <OriginTag origin={p.origin} />
                              </span>
                            ))}
                          </div>
                        ) : (
                          entry.origin !== 'established' && <div><OriginTag origin={entry.origin} /></div>
                        )}
                        <EditableProse value={entry.content} onChange={(v) => editEntry(entry.slot, v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </Band>
              {bible.spine.causal_links.length > 0 && (
                <Band label={t('bible.connectsTitle')} count={t('bible.linkCount', { count: bible.spine.causal_links.length })}>
                  <div className={styles.links}>
                    {bible.spine.causal_links.map((link, i) => (
                      <div className={styles.link} key={i}>
                        <span className={styles.linkSlot}>{labelFor(link.from)}</span>
                        <span className={styles.linkArrow}><Icon name="arrowRight" size={13} /></span>
                        <span className={styles.linkRel}>{link.relation}</span>
                        <span className={styles.linkArrow}><Icon name="arrowRight" size={13} /></span>
                        <span className={styles.linkSlot}>{labelFor(link.to)}</span>
                      </div>
                    ))}
                  </div>
                </Band>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{t('bible.backToInterview')}</Btn>
        <Btn icon="refresh" onClick={() => void synthesize(session.id)} disabled={running} title={t('bible.rebuildHint')}>{t('bible.rebuild')}</Btn>
        <div className={styles.spacer} />
        {dirty ? (
          <Btn variant="primary" icon="check" disabled={saving} onClick={() => void handleSave()}>{saving ? t('bible.saving') : t('bible.save')}</Btn>
        ) : (
          <>
            <Btn icon="shield" disabled={running} onClick={() => void gate(session.id)} title={t('bible.recheckHint')}>{running ? t('bible.checking') : t('bible.recheck')}</Btn>
            <Btn variant="primary" iconRight="arrowRight" onClick={onContinue} title={bible.status === 'flagged' ? t('bible.continueFlaggedHint') : undefined}>{t('bible.continueToRender')}</Btn>
          </>
        )}
      </div>
    </>
  )
}

function fieldStatusOf(def: WeaverFieldDef, field: WeaverField | undefined, rendering: string[]): string {
  if (rendering.includes(def.id)) return 'rendering'
  if (!field) return 'none'
  if (field.stale) return 'stale'
  if (field.status === 'passed' || field.status === 'manually_edited') return 'passed'
  if (field.status === 'flagged') return 'flagged'
  return 'none'
}

function RenderStatusTag({ status, revised }: { status: string; revised?: boolean }) {
  const { t } = useTranslation('weaver')
  if (status === 'rendering') {
    return <span className={clsx(styles.tag, styles.tagRendering)}><Icon name="refresh" size={11} spin /> {t('render.status.rendering')}</span>
  }
  if (status === 'passed') {
    return <Tag kind="success" icon="check">{t('render.status.passed')}{revised ? ` · ${t('render.status.revised')}` : ''}</Tag>
  }
  if (status === 'flagged') return <Tag kind="warning" icon="alert">{t('render.status.flagged')}</Tag>
  if (status === 'stale') return <Tag kind="warning">{t('render.status.stale')}</Tag>
  return <Tag kind="neutral">{t('render.notRenderedTag')}</Tag>
}

function RenderStage({ session, onBack, onContinue }: { session: WeaverSession; onBack: () => void; onContinue: () => void }) {
  const { t } = useTranslation('weaver')
  const fieldDefs = useStore((s) => s.weaverFieldDefs)
  const fields = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverFields : []))
  const rendering = useStore((s) => s.weaverFieldRendering)
  const error = useStore((s) => s.weaverRenderError)
  const bible = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverBible : null))
  const loadFieldDefs = useStore((s) => s.loadWeaverFieldDefs)
  const loadFields = useStore((s) => s.loadWeaverFields)
  const loadBible = useStore((s) => s.loadWeaverBible)
  const renderAll = useStore((s) => s.renderWeaverFields)
  const renderOne = useStore((s) => s.renderWeaverField)
  const editOne = useStore((s) => s.editWeaverField)
  const acceptOne = useStore((s) => s.acceptWeaverField)
  const nudgeOne = useStore((s) => s.nudgeWeaverField)

  useEffect(() => {
    void loadFieldDefs()
    void loadFields(session.id)
    void loadBible(session.id)
  }, [session.id, loadFieldDefs, loadFields, loadBible])

  const orderedDefs = useMemo(() => [...fieldDefs].sort((a, b) => a.order - b.order), [fieldDefs])
  const fieldBy = useMemo(() => new Map(fields.map((f) => [f.field_name, f])), [fields])
  const anyRendering = rendering.length > 0
  const hasAny = fields.length > 0
  const allReady = useMemo(
    () =>
      orderedDefs.length > 0 &&
      orderedDefs.every((d) => {
        const f = fieldBy.get(d.id)
        return Boolean(f && f.content.trim() && (f.status === 'passed' || f.status === 'manually_edited' || f.provenance.accepted === true))
      }),
    [orderedDefs, fieldBy],
  )

  const [focusKey, setFocusKey] = useState<string | null>(null)
  const focusDef = useMemo(
    () => orderedDefs.find((d) => d.id === focusKey) ?? orderedDefs[0] ?? null,
    [orderedDefs, focusKey],
  )

  const spend = useMemo(
    () => fields.reduce((acc, f) => ({ total: acc.total + f.token_usage.total_tokens, calls: acc.calls + f.token_usage.calls }), { total: 0, calls: 0 }),
    [fields],
  )

  const failedBibleCrit = bible?.gate ? bible.gate.criteria.filter((c) => !c.passed).map((c) => c.label) : []

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('render.heading')}</h2>
            <p className={styles.stageHelp}>{t('render.help')}</p>
          </div>
          {hasAny && <div className={styles.spend}>{t('render.spend', { count: spend.total, calls: spend.calls })}</div>}
        </div>
        <div className={styles.scroll}>
          {error && <p className={styles.errorText}>{error}</p>}
          {bible && bible.status === 'flagged' && (
            <div style={{ marginBottom: 24 }}>
              <FlagBand
                compact
                subject={t('render.bibleFlaggedSubject')}
                criteria={failedBibleCrit}
                detail={t('render.bibleFlaggedCompact')}
                note={t('render.flag.compactNote')}
                action={{ label: t('render.openBible'), onClick: onBack }}
              />
            </div>
          )}
          <div className={styles.work}>
            <div className={styles.workRail}>
              <div>
                <div className={styles.railGroupLabel}>{t('render.fieldsRail', { count: orderedDefs.length })}</div>
                <div className={styles.railList}>
                  {orderedDefs.map((def) => {
                    const st = fieldStatusOf(def, fieldBy.get(def.id), rendering)
                    const isFocus = focusDef?.id === def.id
                    const isDirect = def.render === 'direct'
                    return (
                      <div
                        key={def.id}
                        role="button"
                        tabIndex={0}
                        className={clsx(styles.railItem, isFocus && styles.railItemActive)}
                        onClick={() => setFocusKey(def.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusKey(def.id) } }}
                      >
                        <span className={styles.railMarker}><SDot status={st} /></span>
                        <span className={styles.railName}>{def.label}</span>
                        {!isDirect && (
                          <IconBtn
                            icon="refresh"
                            size={13}
                            cls={styles.sq22}
                            title={t('render.rerender')}
                            spin={st === 'rendering'}
                            disabled={anyRendering}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (fieldBy.get(def.id)?.status === 'manually_edited') setFocusKey(def.id)
                              else void renderOne(session.id, def.id)
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className={styles.railLegend}>
                  <span className={styles.railLegendRow}><SDot status="passed" /> {t('render.legend.passed')}</span>
                  <span className={styles.railLegendRow}><SDot status="flagged" /> {t('render.legend.flagged')}</span>
                  <span className={styles.railLegendRow}><SDot status="stale" /> {t('render.legend.stale')}</span>
                  <span className={styles.railLegendRow}><SDot status="none" /> {t('render.legend.none')}</span>
                </div>
              </div>
            </div>

            <div className={styles.workMain}>
              {focusDef && (
                <FieldView
                  def={focusDef}
                  field={fieldBy.get(focusDef.id)}
                  status={fieldStatusOf(focusDef, fieldBy.get(focusDef.id), rendering)}
                  anyRendering={anyRendering}
                  onReRender={(force) => void renderOne(session.id, focusDef.id, force)}
                  onEdit={(content) => void editOne(session.id, focusDef.id, content)}
                  onAccept={(accepted) => void acceptOne(session.id, focusDef.id, accepted)}
                  onNudge={(nudge, force) => void nudgeOne(session.id, focusDef.id, nudge, force)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{t('render.backToBible')}</Btn>
        <Btn variant="primary" icon={anyRendering ? 'refresh' : 'sparkles'} spin={anyRendering} disabled={anyRendering} onClick={() => void renderAll(session.id)}>
          {anyRendering ? t('render.rendering') : hasAny ? t('render.renderAllAgain') : t('render.renderAll')}
        </Btn>
        <div className={styles.spacer} />
        <Btn
          iconRight="arrowRight"
          disabled={!allReady || anyRendering}
          title={allReady ? t('render.continueToFinalize') : t('render.finalizeBlocked')}
          onClick={onContinue}
        >
          {t('render.continueToFinalize')}
        </Btn>
      </div>
    </>
  )
}

function FinalizeStage({ session, onBack, onOpenStudio }: { session: WeaverSession; onBack: () => void; onOpenStudio: () => void }) {
  const { t } = useTranslation('weaver')
  const finalizing = useStore((s) => s.weaverFinalizing)
  const startingChat = useStore((s) => s.weaverStartingChat)
  const error = useStore((s) => s.weaverFinalizeError)
  const result = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverFinalizeResult : null))
  const fields = useStore((s) => (s.weaverStateSessionId === session.id ? s.weaverFields : []))
  const fieldDefs = useStore((s) => s.weaverFieldDefs)
  const finalize = useStore((s) => s.finalizeWeaver)
  const startChat = useStore((s) => s.startWeaverChat)
  const setActiveChat = useStore((s) => s.setActiveChat)
  const closeModal = useStore((s) => s.closeModal)
  const loadFields = useStore((s) => s.loadWeaverFields)
  const loadFieldDefs = useStore((s) => s.loadWeaverFieldDefs)

  useEffect(() => {
    void loadFieldDefs()
    void loadFields(session.id)
  }, [session.id, loadFieldDefs, loadFields])

  const orderedDefs = useMemo(() => [...fieldDefs].sort((a, b) => a.order - b.order), [fieldDefs])
  const fieldBy = useMemo(() => new Map(fields.map((f) => [f.field_name, f])), [fields])
  const isReady = (def: WeaverFieldDef) => {
    const f = fieldBy.get(def.id)
    return Boolean(f && f.content.trim() && (f.status === 'passed' || f.status === 'manually_edited' || f.provenance.accepted === true))
  }
  const allReady = orderedDefs.length > 0 && orderedDefs.every(isReady)
  const finalized = Boolean(result) || session.status === 'finalized'
  const cardName = result?.character.name ?? (fieldBy.get('name')?.content.trim() || t('finalize.untitled'))

  const onStart = async () => {
    try {
      const r = await startChat(session.id)
      setActiveChat(r.chat.id, r.chat.character_id)
      closeModal()
    } catch {
    }
  }

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.stageHead}>
          <div className={styles.stageHeadL}>
            <h2 className={styles.stageH}>{t('finalize.heading')}</h2>
            <p className={styles.stageHelp}>{finalized ? t('finalize.doneHelp') : t('finalize.help')}</p>
          </div>
        </div>
        <div className={styles.scroll}>
          {error && <p className={styles.errorText}>{error}</p>}

          {finalized ? (
            <Band label={t('finalize.cardBandLabel')}>
              <div className={styles.fieldNameBig}>{cardName}</div>
              <p className={styles.stageHelp}>{t('finalize.doneBody')}</p>
              <div className={styles.railLegend}>
                <span className={styles.railLegendRow}><Tag kind="success" icon="check">{t('finalize.tagCard')}</Tag></span>
                <span className={styles.railLegendRow}><Tag kind="neutral" icon="shield">{t('finalize.tagPreset')}</Tag></span>
              </div>
            </Band>
          ) : (
            <>
              <Band label={t('finalize.readyBandLabel', { count: orderedDefs.length })}>
                <div className={styles.railList}>
                  {orderedDefs.map((def) => (
                    <div key={def.id} className={styles.railItem}>
                      <span className={styles.railMarker}><SDot status={isReady(def) ? 'passed' : 'none'} /></span>
                      <span className={styles.railName}>{def.label}</span>
                      {!isReady(def) && <Tag kind="warning">{t('finalize.pending')}</Tag>}
                    </div>
                  ))}
                </div>
              </Band>
              <Band label={t('finalize.governanceBandLabel')}>
                <p className={styles.stageHelp}>{t('finalize.governanceBody')}</p>
              </Band>
            </>
          )}
        </div>
      </div>
      <div className={styles.footer}>
        <Btn icon="arrowLeft" onClick={onBack}>{t('finalize.backToRender')}</Btn>
        <div className={styles.spacer} />
        {finalized ? (
          <>
            <Btn icon={startingChat ? 'refresh' : 'chat'} spin={startingChat} disabled={startingChat} onClick={() => void onStart()}>
              {t('finalize.startChat')}
            </Btn>
            <Btn variant="primary" iconRight="arrowRight" onClick={onOpenStudio}>
              {t('finalize.continueToStudio')}
            </Btn>
          </>
        ) : (
          <Btn
            variant="primary"
            icon={finalizing ? 'refresh' : 'check'}
            spin={finalizing}
            disabled={!allReady || finalizing}
            title={allReady ? t('finalize.finalize') : t('finalize.blocked')}
            onClick={() => void finalize(session.id)}
          >
            {finalizing ? t('finalize.finalizing') : t('finalize.finalize')}
          </Btn>
        )}
      </div>
    </>
  )
}

function FieldView({ def, field, status, anyRendering, onReRender, onEdit, onAccept, onNudge }: {
  def: WeaverFieldDef
  field: WeaverField | undefined
  status: string
  anyRendering: boolean
  onReRender: (force?: boolean) => void
  onEdit: (content: string) => void
  onAccept: (accepted: boolean) => void
  onNudge: (nudge: string, force?: boolean) => void
}) {
  const { t } = useTranslation('weaver')
  const isDirect = def.render === 'direct'
  const isRendered = Boolean(field)
  const isEdited = field?.status === 'manually_edited'
  const accepted = field?.provenance.accepted === true
  const stale = field?.stale === true
  const busy = status === 'rendering' || anyRendering

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [nudge, setNudge] = useState('')
  const [pending, setPending] = useState<null | { kind: 'render' } | { kind: 'nudge'; text: string }>(null)

  useEffect(() => { setEditing(false); setNudge(''); setPending(null) }, [def.id])

  const beginEdit = () => { setDraft(field?.content ?? ''); setEditing(true) }
  const requestReRender = () => { if (isEdited) setPending({ kind: 'render' }); else onReRender() }
  const submitNudge = () => {
    const text = nudge.trim()
    if (!text) return
    if (isEdited) { setPending({ kind: 'nudge', text }); return }
    onNudge(text); setNudge('')
  }
  const runPending = () => {
    if (!pending) return
    if (pending.kind === 'render') onReRender(true)
    else { onNudge(pending.text, true); setNudge('') }
    setPending(null)
  }

  return (
    <div>
      <div className={styles.fieldHead}>
        <div className={styles.fieldHeadL}>
          <span className={styles.fieldTitle}>{def.label}</span>
          {isDirect && <span className={styles.fieldSub}>{t('render.directFieldNote')}</span>}
        </div>
        <div className={styles.fieldHeadR}>
          <RenderStatusTag status={status} revised={field?.provenance.revised} />
          {isEdited && <Tag kind="neutral" icon="pencil">{t('render.editTag')}</Tag>}
          {accepted && <Tag kind="success" icon="check">{t('render.acceptedTag')}</Tag>}
          {isRendered && !editing && <IconBtn icon="pencil" size={15} cls={styles.sq26} title={t('render.edit')} disabled={busy} onClick={beginEdit} />}
          {!isDirect && <IconBtn icon="refresh" size={15} cls={styles.sq26} title={t('render.rerender')} spin={status === 'rendering'} disabled={anyRendering} onClick={requestReRender} />}
        </div>
      </div>

      {stale && !editing && status !== 'rendering' && (
        <FlagBand
          inField
          subject={def.label}
          detail={isEdited ? t('render.staleBodyEdited') : t('render.staleBody')}
          fix={t('render.staleTitle')}
          note={t('render.noRetryNote')}
          action={{ label: t('render.rerender'), onClick: requestReRender }}
        />
      )}

      {pending && (
        <FlagBand
          inField
          subject={t('render.replaceEditTitle')}
          detail={t('render.replaceEditBody')}
          note={t('render.noRetryNote')}
          action={{ label: t('render.replaceEdit'), onClick: runPending }}
        />
      )}

      {status === 'rendering' ? (
        <div className={styles.fieldRendering}><Icon name="refresh" size={16} spin /> {t('render.renderingField', { field: def.label })}</div>
      ) : editing ? (
        <div className={styles.editArea}>
          <textarea
            className={styles.field}
            value={draft}
            rows={isDirect ? 2 : 12}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={styles.editActions}>
            <Btn onClick={() => setEditing(false)}>{t('render.editCancel')}</Btn>
            <Btn variant="primary" disabled={!draft.trim()} onClick={() => { onEdit(draft); setEditing(false) }}>{t('render.editSave')}</Btn>
          </div>
        </div>
      ) : !field || !field.content ? (
        <div className={styles.fieldEmpty}>{field?.status === 'flagged' ? t('render.flaggedNoContent') : t('render.notRendered')}</div>
      ) : isDirect ? (
        <div className={styles.fieldNameBig}>{field.content}</div>
      ) : (
        <div className={styles.fieldBody} dangerouslySetInnerHTML={{ __html: renderFieldPreview(def.kind, field.content) }} />
      )}

      {status === 'flagged' && field?.provenance.gate && !editing && (
        <FlagBand
          inField
          subject={t('render.fieldFlaggedSubject', { field: def.label })}
          criteria={field.provenance.gate.criteria.filter((c) => !c.passed).map((c) => c.label)}
          detail={field.provenance.gate.summary}
          fix={t('render.fieldFlaggedFix')}
          note={t('render.noRetryNote')}
        />
      )}

      {isRendered && !editing && status !== 'rendering' && (
        <div className={styles.fieldTools}>
          <Btn icon={accepted ? 'check' : null} disabled={busy} onClick={() => onAccept(!accepted)}>
            {accepted ? t('render.unaccept') : t('render.accept')}
          </Btn>
          {!isDirect && (
            <div className={styles.toolRow}>
              <input
                className={styles.toolin}
                value={nudge}
                placeholder={t('render.nudgePlaceholder')}
                disabled={anyRendering}
                onChange={(e) => setNudge(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitNudge() } }}
              />
              <Btn icon="sparkles" disabled={anyRendering || !nudge.trim()} onClick={submitNudge}>{t('render.nudgeRun')}</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
