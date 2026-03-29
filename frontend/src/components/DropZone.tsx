/**
 * DropZone — drag-and-drop + click-to-browse file input.
 * Accepts images and videos; validates type and size client-side.
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImageIcon, Film, AlertCircle } from 'lucide-react'
import type { UploadedFile, FileType } from '@/types'

interface Props {
  onFile: (f: UploadedFile) => void
  disabled?: boolean
}

const MAX_IMAGE_MB = 20
const MAX_VIDEO_MB = 500

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
}

function fileType(mime: string): FileType {
  return mime.startsWith('video/') ? 'video' : 'image'
}

export default function DropZone({ onFile, disabled }: Props) {
  const [localError, setLocalError] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      setLocalError(null)
      const file = accepted[0]
      if (!file) return

      const type = fileType(file.type)
      const maxMB = type === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB
      if (file.size > maxMB * 1024 * 1024) {
        setLocalError(`File too large — max ${maxMB} MB for ${type}s`)
        return
      }

      onFile({
        file,
        type,
        previewUrl: URL.createObjectURL(file),
      })
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    disabled,
    onDropRejected: () => setLocalError('Unsupported file type. Use JPG, PNG, WebP, MP4, MOV, or AVI.'),
  })

  const borderColor = isDragReject
    ? 'border-red-500'
    : isDragActive
    ? 'border-brand-400'
    : 'border-[var(--border)]'

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-xl border-2 border-dashed
          transition-all duration-200 cursor-pointer group
          ${borderColor}
          ${isDragActive ? 'bg-[var(--accent-glow2)]' : 'bg-[var(--bg-card)]'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]'}
        `}
        style={{ minHeight: 220 }}
      >
        <input {...getInputProps()} />

        {/* Scan animation on hover */}
        {!disabled && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                animation: isDragActive ? 'scan 1.5s linear infinite' : undefined,
                top: '0%',
              }}
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-14 px-8 text-center gap-4">
          <AnimatePresence mode="wait">
            {isDragActive ? (
              <motion.div
                key="drag"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-glow)', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <Upload size={26} color="var(--accent)" />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex gap-3"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <ImageIcon size={22} color="var(--text-muted)" />
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <Film size={22} color="var(--text-muted)" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <p className="font-semibold text-[var(--text-primary)] text-base">
              {isDragActive ? 'Drop to analyse' : 'Drop a file here'}
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              or{' '}
              <span className="text-[var(--accent)] font-medium hover:underline">
                click to browse
              </span>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {['JPG', 'PNG', 'WebP', 'MP4', 'MOV', 'AVI'].map((ext) => (
              <span
                key={ext}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-dim)',
                  border: '1px solid var(--border)',
                }}
              >
                {ext}
              </span>
            ))}
          </div>

          <p className="text-xs text-[var(--text-dim)]">
            Images up to {MAX_IMAGE_MB} MB · Videos up to {MAX_VIDEO_MB} MB
          </p>
        </div>
      </div>

      {/* Client-side validation error */}
      <AnimatePresence>
        {localError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle size={14} />
            {localError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
