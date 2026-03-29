import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  error: string | null
  onRetry: () => void
}

export default function ErrorBanner({ error, onRetry }: Props) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertTriangle size={16} color="var(--red)" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>Processing failed</p>
            <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
          <button onClick={onRetry} className="btn-ghost text-xs py-1.5 px-3 flex-shrink-0">
            <RefreshCw size={12} />
            Retry
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
