import { useState, useCallback, useEffect, useRef, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react'
import { Spinner } from '@/components/shared/Spinner'

export const LAZY_CONTENT_LOADING_EVENT = 'lumiverse:lazy-content-loading'

interface LazyImageProps {
  src?: string | null
  alt?: string
  style?: CSSProperties
  objectPosition?: string
  className?: string
  fallback?: ReactNode
  spinnerSize?: number
  containerClassName?: string
  containerStyle?: CSSProperties
  /**
   * When true, load the image immediately instead of deferring to the browser's
   * lazy-loading scheduler. Useful for images inside currently-visible virtual
   * rows so the virtualizer can measure the final row height on first paint.
   */
  eager?: boolean
  /**
   * Aspect ratio to reserve while the image is loading, e.g. "16 / 9" or 1.5.
   * Lets the parent container hold the correct space before the image decode
   * finishes, avoiding the layout thrash that occurs when a 0-height spinner
   * suddenly becomes a fully-sized image.
   */
  aspectRatio?: string | number
  /**
   * Minimum height for the loading placeholder. Used as a fallback when no
   * aspect ratio is available and the parent doesn't provide an explicit size.
   */
  placeholderMinHeight?: number
  [key: string]: any
}

export default function LazyImage({
  src,
  alt = '',
  style = {},
  objectPosition = 'center',
  className = '',
  fallback = null,
  spinnerSize = 24,
  containerClassName = '',
  containerStyle = {},
  eager = false,
  aspectRatio,
  placeholderMinHeight,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const prevSrcRef = useRef(src)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingNotifiedRef = useRef(false)

  useEffect(() => {
    if (src !== prevSrcRef.current) {
      prevSrcRef.current = src
      setIsLoading(true)
      setHasError(false)
      loadingNotifiedRef.current = false
    }
  }, [src])

  // Notify ancestors (notably the chat virtualizer) that this lazy element is
  // about to perform work that may change the row's height. The virtualizer
  // can capture a reflow anchor and restore scroll position once the content
  // settles, rather than letting the user be pushed around by the inflation.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !src || !isLoading || loadingNotifiedRef.current) return
    loadingNotifiedRef.current = true
    container.dispatchEvent(new CustomEvent(LAZY_CONTENT_LOADING_EVENT, { bubbles: true }))
  }, [src, isLoading])

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    onLoad?.(event)
  }, [onLoad])
  const handleError = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    setHasError(true)
    onError?.(event)
  }, [onError])

  if (hasError || !src) return <>{fallback}</>

  const containerInline: CSSProperties = containerClassName
    ? { position: 'relative', overflow: 'hidden', ...containerStyle }
    : { position: 'relative', width: '100%', height: '100%', ...containerStyle }

  const placeholderStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--lumiverse-primary, #9370db)',
    opacity: 0.6,
    background: 'var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.04))',
    aspectRatio: aspectRatio ? String(aspectRatio) : undefined,
    minHeight: placeholderMinHeight,
  }

  return (
    <div ref={containerRef} style={containerInline} className={containerClassName || undefined}>
      {isLoading && (
        <div style={placeholderStyle}>
          <Spinner size={spinnerSize} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'opacity 0.2s ease, transform var(--lazy-image-transform-transition, 0ms)',
          objectPosition,
          opacity: isLoading ? 0 : 1,
          ...style,
        }}
        className={className}
        loading={eager ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}
