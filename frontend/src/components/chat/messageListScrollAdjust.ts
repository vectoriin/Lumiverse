export interface MessageListScrollAdjustmentInput {
  delta: number
  itemStart: number
  itemEnd: number
  scrollOffset: number
  scrollDirection: 'forward' | 'backward' | null
  hasMeasuredSize: boolean
  isPinned: boolean
  isStreamingTail: boolean
}

export function shouldAdjustMessageListScrollOnResize({
  delta,
  itemStart,
  itemEnd,
  scrollOffset,
  scrollDirection,
  hasMeasuredSize,
  isPinned,
  isStreamingTail,
}: MessageListScrollAdjustmentInput) {
  const overlapsViewportTop = itemStart < scrollOffset && itemEnd > scrollOffset

  // For the active streaming tail row, height only grows downward as tokens
  // arrive. Once the user has manually unpinned, compensating scrollTop while
  // the viewport sits inside that row makes the whole list climb upward.
  if (!isPinned && isStreamingTail && delta > 0 && overlapsViewportTop) {
    return false
  }

  return itemStart < scrollOffset && (!hasMeasuredSize || scrollDirection !== 'backward')
}
