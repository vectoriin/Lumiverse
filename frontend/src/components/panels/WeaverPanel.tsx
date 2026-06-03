import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowRight, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { connectionsApi } from '@/api/connections'
import SearchableSelect, { type SearchableSelectOption } from '@/components/shared/SearchableSelect'
import ModelCombobox from '@/components/panels/connection-manager/ModelCombobox'
import styles from './WeaverPanel.module.css'

const PERSONA_NONE = '__none__'

export default function WeaverPanel() {
  const { t } = useTranslation('weaver')
  const openModal = useStore((s) => s.openModal)

  const personas = useStore((s) => s.personas)
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)

  const sessions = useStore((s) => s.weaverSessions)
  const activeId = useStore((s) => s.activeWeaverSessionId)
  const loadSessions = useStore((s) => s.loadWeaverSessions)
  const createSession = useStore((s) => s.createWeaverSession)
  const openSession = useStore((s) => s.openWeaverSession)
  const deleteSession = useStore((s) => s.deleteWeaverSession)
  const updateSeed = useStore((s) => s.updateWeaverSeed)
  const setConfig = useStore((s) => s.setWeaverSessionConfig)

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  )

  const [dream, setDream] = useState('')
  const [personaId, setPersonaId] = useState<string>(PERSONA_NONE)
  const [connectionId, setConnectionId] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelLabels, setModelLabels] = useState<Record<string, string>>({})
  const [loadingModels, setLoadingModels] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    setDream(active?.seed.text ?? '')
    setPersonaId(active?.persona_id ?? PERSONA_NONE)
    setConnectionId(active?.connection_id ?? '')
    setModel(active?.model ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  const effectiveConnectionId = connectionId || activeProfileId || ''
  const selectedConnection = useMemo(
    () => profiles.find((p) => p.id === effectiveConnectionId),
    [profiles, effectiveConnectionId],
  )

  const fetchModels = useCallback(async () => {
    if (!effectiveConnectionId) {
      setAvailableModels([])
      setModelLabels({})
      return
    }
    setLoadingModels(true)
    try {
      const result = await connectionsApi.models(effectiveConnectionId)
      setAvailableModels(result.models || [])
      setModelLabels(result.model_labels || {})
    } catch {
      setAvailableModels([])
      setModelLabels({})
    } finally {
      setLoadingModels(false)
    }
  }, [effectiveConnectionId])

  useEffect(() => {
    void fetchModels()
  }, [fetchModels])

  const personaOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [{ value: PERSONA_NONE, label: t('panel.personaNone') }]
    personas.forEach((p) => opts.push({ value: p.id, label: p.name }))
    return opts
  }, [personas, t])

  const connectionOptions = useMemo<SearchableSelectOption[]>(
    () => profiles.map((p) => ({ value: p.id, label: p.name, sublabel: p.provider })),
    [profiles],
  )

  const handleBegin = async () => {
    if (!dream.trim() || busy) return
    setBusy(true)
    try {
      let id = active?.id
      if (!id) id = (await createSession()).id
      await updateSeed(id, dream)
      await setConfig(id, {
        connection_id: effectiveConnectionId || null,
        model: model || selectedConnection?.model || null,
        persona_id: personaId === PERSONA_NONE ? null : personaId,
      })
      openSession(id)
      openModal('weaver')
    } finally {
      setBusy(false)
    }
  }

  const startFresh = () => {
    openSession(null)
    setDream('')
    setPersonaId(PERSONA_NONE)
    setConnectionId('')
    setModel('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('title')}</span>
        {active && (
          <button className={styles.newBtn} onClick={startFresh}>
            <Plus size={14} />
            {t('sessions.new')}
          </button>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('panel.persona')}</span>
        <SearchableSelect
          options={personaOptions}
          value={personaId}
          onChange={(v) => setPersonaId(v || PERSONA_NONE)}
          placeholder={t('panel.personaNone')}
          ariaLabel={t('panel.persona')}
          portal
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('panel.connection')}</span>
        <SearchableSelect
          options={connectionOptions}
          value={effectiveConnectionId}
          onChange={(v) => {
            setConnectionId(v)
            setModel('')
          }}
          placeholder={t('panel.connectionNone')}
          ariaLabel={t('panel.connection')}
          disabled={connectionOptions.length === 0}
          portal
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('panel.model')}</span>
        <ModelCombobox
          value={model}
          onChange={setModel}
          models={availableModels}
          modelLabels={modelLabels}
          loading={loadingModels}
          onRefresh={fetchModels}
          autoRefreshOnFocus
          refreshKey={effectiveConnectionId}
          placeholder={t('panel.modelNone')}
          disabled={!effectiveConnectionId}
        />
      </div>

      <div className={styles.dreamWrap}>
        <span className={styles.fieldLabel}>{t('dream.heading')}</span>
        <textarea
          className={styles.dream}
          value={dream}
          placeholder={t('dream.placeholder')}
          onChange={(e) => setDream(e.target.value)}
        />
      </div>

      <button className={styles.begin} onClick={() => void handleBegin()} disabled={!dream.trim() || busy}>
        {active ? t('panel.resume') : t('panel.begin')}
        <ArrowRight size={15} />
      </button>

      {sessions.length > 0 && (
        <div className={styles.sessions}>
          <span className={styles.fieldLabel}>{t('sessions.title')}</span>
          <ul className={styles.sessionList}>
            {sessions.map((s) => (
              <li key={s.id} className={s.id === activeId ? styles.sessionActive : styles.session}>
                <button
                  className={styles.sessionOpen}
                  onClick={() => {
                    openSession(s.id)
                    openModal('weaver')
                  }}
                >
                  <span className={styles.sessionLabel}>
                    {s.seed.text.trim().slice(0, 48) || t('sessions.untitled')}
                  </span>
                  <span className={styles.sessionMeta}>{t(`stages.${s.stage}`)}</span>
                </button>
                <button
                  className={styles.sessionDelete}
                  onClick={() => {
                    if (window.confirm(t('sessions.deleteConfirm'))) void deleteSession(s.id)
                  }}
                  aria-label={t('sessions.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
