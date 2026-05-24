import { useState, useCallback } from 'react'
import { Copy, Check, Pencil, Trash2, EyeOff, Eye, BarChart3, Volume2, Square } from 'lucide-react'
import { IconGitFork } from '@tabler/icons-react'
import { copyTextToClipboard } from '@/lib/clipboard'
import styles from './BubbleActions.module.css'

interface BubbleActionsProps {
  onEdit: () => void
  onDelete: () => void
  onToggleHidden: () => void
  onFork: () => void
  onPromptBreakdown?: () => void
  onPlay?: () => void
  isPlaying?: boolean
  /** True while a save-first TTS regen is in flight — swaps the play
   *  button to a cancel affordance. */
  isGenerating?: boolean
  /** True when this message already has a persisted audio attachment —
   *  changes the play tooltip to "Regenerate". */
  hasSavedAudio?: boolean
  isHidden: boolean
  content: string
  className?: string
}

export default function BubbleActions({
  onEdit,
  onDelete,
  onToggleHidden,
  onFork,
  onPromptBreakdown,
  onPlay,
  isPlaying,
  isGenerating,
  hasSavedAudio,
  isHidden,
  content,
  className,
}: BubbleActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    copyTextToClipboard(content).catch(console.error)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [content])

  const playLabel = isGenerating
    ? 'Cancel TTS generation'
    : isPlaying
      ? 'Stop playback'
      : hasSavedAudio
        ? 'Regenerate TTS audio'
        : 'Play with TTS'
  const showStopIcon = !!(isGenerating || isPlaying)

  return (
    <div data-component="BubbleActions" className={className ? `${styles.pill} ${className}` : styles.pill}>
      <button type="button" onClick={handleCopy} title="Copy" aria-label="Copy">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <button type="button" onClick={onEdit} title="Edit" aria-label="Edit">
        <Pencil size={13} />
      </button>
      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          title={playLabel}
          aria-label={playLabel}
          aria-pressed={isPlaying}
        >
          {showStopIcon ? <Square size={13} /> : <Volume2 size={13} />}
        </button>
      )}
      <button
        type="button"
        onClick={onToggleHidden}
        title={isHidden ? 'Unhide from AI context' : 'Hide from AI context'}
        aria-label={isHidden ? 'Unhide' : 'Hide'}
      >
        {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button type="button" onClick={onFork} title="Fork chat here" aria-label="Fork chat">
        <IconGitFork size={13} />
      </button>
      {onPromptBreakdown && (
        <button type="button" onClick={onPromptBreakdown} title="Prompt breakdown" aria-label="Prompt breakdown">
          <BarChart3 size={13} />
        </button>
      )}
      <button type="button" onClick={onDelete} title="Delete" aria-label="Delete">
        <Trash2 size={13} />
      </button>
    </div>
  )
}
