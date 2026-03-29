/**
 * FilePreview — shows thumbnail/video preview of the selected file
 * before processing starts, with metadata chips.
 */
import { motion } from 'framer-motion'
import { ImageIcon, Film, X, Play } from 'lucide-react'
import type { UploadedFile } from '@/types'

interface Props {
  uploaded: UploadedFile
  onClear: () => void
  onProcess: () => void
  disabled?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilePreview({ uploaded, onClear, onProcess, disabled }: Props) {
  const isImage = uploaded.type === 'image'
  const Icon = isImage ? ImageIcon : Film

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: 'var(--accent-glow)' }}
          >
            <Icon size={13} color="var(--accent)" />
          </div>
          <span className="text-sm font-medium truncate max-w-[260px]" style={{ color: 'var(--text-primary)' }}>
            {uploaded.file.name}
          </span>
        </div>
        <button
          onClick={onClear}
          disabled={disabled}
          className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-dim)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Preview */}
      <div className="bg-[var(--bg-secondary)] flex items-center justify-center" style={{ minHeight: 200 }}>
        {isImage ? (
          <img
            src={uploaded.previewUrl}
            alt="Preview"
            className="max-w-full max-h-72 object-contain"
          />
        ) : (
          <video
            src={uploaded.previewUrl}
            className="max-w-full max-h-72"
            controls
            muted
          />
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <span className={`badge ${isImage ? 'badge-green' : 'badge-amber'}`}>
            {uploaded.type}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
            {formatBytes(uploaded.file.size)}
          </span>
        </div>

        <button onClick={onProcess} disabled={disabled} className="btn-primary">
          <Play size={14} />
          Analyse
        </button>
      </div>
    </motion.div>
  )
}
