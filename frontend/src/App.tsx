/**
 * App â€” root component. Orchestrates the full detection workflow.
 *
 * State machine (managed by useHumanCount):
 *   idle â†’ [file selected] â†’ uploading â†’ processing â†’ done | error
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import Header from '@/components/Header'
import DropZone from '@/components/DropZone'
import FilePreview from '@/components/FilePreview'
import ProgressPanel from '@/components/ProgressPanel'
import ImageResultPanel from '@/components/ImageResultPanel'
import VideoResultPanel from '@/components/VideoResultPanel'
import ErrorBanner from '@/components/ErrorBanner'
import LiveDetector from '@/components/LiveDetector'
import { useHumanCount } from '@/hooks/useHumanCount'
import type { UploadedFile } from '@/types'

export default function App() {
  const [mode, setMode] = useState<'upload' | 'live'>('upload')
  const { state, run, reset } = useHumanCount()

  const {
    uploaded,
    status,
    uploadProgress,
    processingProgress,
    imageResult,
    videoResult,
    error,
    uniqueCountDuringProcess,
  } = state

  const busy = status === 'uploading' || status === 'processing'
  const done = status === 'done'

  const handleFile = (f: UploadedFile) => {
    // Auto-start processing as soon as file is selected
    run(f)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2 pb-2"
        >
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Count humans in{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--accent), #86efac)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              any media
            </span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Upload an image or video â€” YOLOv8 + ByteTrack detects and counts every unique person.
          </p>
        </motion.div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-3">
          <button
            className={mode === 'upload' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setMode('upload')}
          >
            Upload Mode
          </button>
          <button
            className={mode === 'live' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setMode('live')}
          >
            Live Mode
          </button>
        </div>

        {mode === 'live' && <LiveDetector />}

        {mode === 'upload' && (
          <>
            {/* Drop zone â€” only shown when idle or error (no file yet) */}
            <AnimatePresence>
              {!uploaded && (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <DropZone onFile={handleFile} disabled={busy} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* File preview â€” shown while processing or when file is ready but not started */}
            <AnimatePresence>
              {uploaded && !done && status !== 'error' && (
                <FilePreview
                  uploaded={uploaded}
                  onClear={reset}
                  onProcess={() => run(uploaded)}
                  disabled={busy}
                />
              )}
            </AnimatePresence>

            {/* Progress feedback */}
            <AnimatePresence>
              {busy && (
                <ProgressPanel
                  key="progress"
                  status={status}
                  uploadProgress={uploadProgress}
                  processingProgress={processingProgress}
                  uniqueCountLive={uniqueCountDuringProcess}
                  fileType={uploaded?.type ?? null}
                />
              )}
            </AnimatePresence>

            {/* Error state */}
            <ErrorBanner error={error} onRetry={reset} />

            {/* Results */}
            <AnimatePresence>
              {done && imageResult && uploaded && (
                <motion.div key="image-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* New analysis button */}
                  <div className="flex justify-end mb-4">
                    <button onClick={reset} className="btn-ghost">
                      â† New analysis
                    </button>
                  </div>
                  <ImageResultPanel result={imageResult} previewUrl={uploaded.previewUrl} />
                  <div className="flex justify-center mt-6">
                    <button onClick={reset} className="btn-primary">
                      Detect New Media
                    </button>
                  </div>
                </motion.div>
              )}

              {done && videoResult && (
                <motion.div key="video-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex justify-end mb-4">
                    <button onClick={reset} className="btn-ghost">
                      â† New analysis
                    </button>
                  </div>
                  <VideoResultPanel result={videoResult} />
                  <div className="flex justify-center mt-6">
                    <button onClick={reset} className="btn-primary">
                      Detect New Media
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-5 text-center text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        HumanCount Â· YOLOv8 Â· ByteTrack Â· Built with FastAPI + React
      </footer>
    </div>
  )
}
