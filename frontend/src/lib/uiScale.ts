export function getUiScale(): number {
  if (typeof window === 'undefined') return 1
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--lumiverse-ui-scale')
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function renderedPxToLayoutPx(renderedPx: number): number {
  const uiScale = getUiScale()
  return uiScale === 1 ? renderedPx : renderedPx / uiScale
}
