import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, Download } from 'lucide-react'
import { useStore } from '@/store'
import { Spinner } from './Spinner'
import styles from './ConnectionLostOverlay.module.css'

/**
 * Full-screen, non-dismissable overlay shown when the WebSocket connection to
 * the backend has dropped after the user was already authenticated and using
 * the app. Auto-dismisses once all three healthy signals coincide:
 *   1. Socket OPEN (wsConnected)
 *   2. Backend CONNECTED event with role received (wsAuthSynced)
 *   3. Pong received since the last open (wsRoundTripVerified)
 *
 * The overlay is suppressed until the user has had at least one fully healthy
 * connection in this session (wsHasEverConnected) — that prevents a flash
 * during cold start, login, or page refresh.
 */
export default function ConnectionLostOverlay() {
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const wsConnected = useStore((s) => s.wsConnected)
  const wsAuthSynced = useStore((s) => s.wsAuthSynced)
  const wsRoundTripVerified = useStore((s) => s.wsRoundTripVerified)
  const wsHasEverConnected = useStore((s) => s.wsHasEverConnected)
  const wsUpdatePending = useStore((s) => s.wsUpdatePending)

  const healthy = wsConnected && wsAuthSynced && wsRoundTripVerified
  // wsUpdatePending forces the overlay to stay up through the bundle swap, so
  // the user never sees a flash of normal UI before the page reloads.
  const visible = isAuthenticated && (wsUpdatePending || (wsHasEverConnected && !healthy))

  const title = wsUpdatePending ? 'Updating Lumiverse' : 'Server connection lost'
  const message = wsUpdatePending
    ? 'A new version is available. Applying the update — the page will refresh in a moment.'
    : wsConnected
      ? wsAuthSynced
        ? 'Verifying connection…'
        : 'Re-syncing your session…'
      : 'The server has become unreachable. We’ll automatically restore your session as soon as it’s back.'
  const statusText = wsUpdatePending
    ? 'Installing latest bundle…'
    : wsConnected
      ? 'Verifying…'
      : 'Attempting to reconnect…'

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="connection-lost-title"
          aria-describedby="connection-lost-message"
        >
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className={wsUpdatePending ? styles.iconRingUpdate : styles.iconRing}
              aria-hidden="true"
            >
              <span className={styles.pulse} />
              {wsUpdatePending ? (
                <Download size={28} strokeWidth={2} />
              ) : (
                <WifiOff size={28} strokeWidth={2} />
              )}
            </div>
            <h2 id="connection-lost-title" className={styles.title}>
              {title}
            </h2>
            <p id="connection-lost-message" className={styles.message}>
              {message}
            </p>
            <span className={styles.status}>
              <Spinner size={14} />
              {statusText}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
