/**
 * ProgressPanel — shows upload progress, processing progress,
 * and a live unique-count ticker during video analysis.
 */
import { motion } from 'framer-motion'
import { Loader2, Users, Cpu } from 'lucide-react'
import type { ProcessingStatus } from '@/types'

interface Props {
  status: ProcessingStatus
  uploadProgress: number
  processingProgress: number
  uniqueCountLive: number
  fileType: 'image' | 'video' | null
}

function ProgressBar({ value, label, animated }: { value: number; label: string; animated?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: 'var(--accent)' }}>{Math.round(value)}%</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <motion.div
          className={`h-full rounded-full ${animated ? 'progress-animated' : ''}`}
          style={{ background: animated ? undefined : 'var(--accent)', width: `${value}%` }}
          animate={{ width: `${value}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />
      </div>
    </div>
  )
}

export default function ProgressPanel({
  status,
  uploadProgress,
  processingProgress,
  uniqueCountLive,
  fileType,
}: Props) {
  if (status === 'idle' || status === 'done' || status === 'error') return null

  const isUploading   = status === 'uploading'
  const isProcessing  = status === 'processing'
  const isVideo       = fileType === 'video'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="card p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-glow)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          {isProcessing
            ? <Cpu size={16} color="var(--accent)" />
            : <Loader2 size={16} color="var(--accent)" className="animate-spin" />
          }
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {isUploading ? 'Uploading file…' : 'Running AI detection…'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isUploading
              ? 'Transferring to server'
              : isVideo
              ? 'Tracking persons across frames with ByteTrack'
              : 'Running YOLOv8 inference'
            }
          </p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        <ProgressBar value={uploadProgress} label="Upload" />
        {isProcessing && (
          <ProgressBar
            value={isVideo ? processingProgress : 50}
            label={isVideo ? 'Frame analysis' : 'Inference'}
            animated={!isVideo}
          />
        )}
      </div>

      {/* Live unique count for video */}
      {isVideo && isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <Users size={18} color="var(--accent)" />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unique persons found so far</p>
            <motion.p
              key={uniqueCountLive}
              initial={{ scale: 1.3, color: '#4ade80' }}
              animate={{ scale: 1, color: 'var(--text-primary)' }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold font-mono leading-none mt-0.5"
            >
              {uniqueCountLive}
            </motion.p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
