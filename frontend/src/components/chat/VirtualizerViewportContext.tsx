import { createContext, useContext } from 'react'

/**
 * Tracks which message rows are currently visible in the chat virtualizer.
 *
 * Message sub-components (attachments, audio slots, etc.) can use this to
 * decide whether to load heavy/lazy content eagerly. Loading visible content
 * eagerly prevents the browser's native lazy-loading delay from racing the
 * virtualizer's measurement, which is the source of the scroll jumps users
 * see when images or TTS players inflate after a row has already been laid
 * out.
 */
interface VirtualizerViewportContextValue {
  /** Set of message ids whose rows intersect the current virtualizer range. */
  visibleMessageIds: Set<string>
}

const VirtualizerViewportContext = createContext<VirtualizerViewportContextValue>({
  visibleMessageIds: new Set(),
})

export const VirtualizerViewportProvider = VirtualizerViewportContext.Provider

/**
 * Returns true if the message row for the given id is currently mounted in
 * the virtualizer's visible range. Prefer this over IntersectionObserver
 * inside virtual rows because the virtualizer already knows its range.
 */
export function useIsMessageInViewport(messageId: string | undefined): boolean {
  const { visibleMessageIds } = useContext(VirtualizerViewportContext)
  return messageId ? visibleMessageIds.has(messageId) : false
}
