/**
 * ImageResult — shows the annotated image and detection stats.
 * Renders bounding boxes as an SVG overlay on the original image.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Download, Eye, EyeOff, Info } from 'lucide-react'
import type { ImageResult as IImageResult } from '@/types'

interface Props {
  result: IImageResult
  previewUrl: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function ImageResultPanel({ result, previewUrl }: Props) {
  const [showBoxes, setShowBoxes] = useState(true)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const processedUrl = `${API_BASE}${result.processed_image_url}`

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    setImgSize({ w: el.clientWidth, h: el.clientHeight })
    setImgLoaded(true)
  }

  const avgConf =
    result.boxes.length > 0
      ? result.boxes.reduce((a, b) => a + b.confidence, 0) / result.boxes.length
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'People detected', value: result.count, accent: true },
          { label: 'Avg confidence', value: `${(avgConf * 100).toFixed(0)}%`, accent: false },
          { label: 'Resolution', value: `${result.original_width}×${result.original_height}`, accent: false },
        ].map((s) => (
          <div key={s.label} className="stat-block text-center">
            <p
              className="text-2xl font-bold font-mono"
              style={{ color: s.accent ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Image container */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Users size={14} color="var(--accent)" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {result.count} {result.count === 1 ? 'person' : 'people'} detected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBoxes((v) => !v)}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              {showBoxes ? <EyeOff size={13} /> : <Eye size={13} />}
              {showBoxes ? 'Hide boxes' : 'Show boxes'}
            </button>
            <a
              href={processedUrl}
              download
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Download size={13} />
              Download
            </a>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-[var(--bg-secondary)]">
          <img
            src={processedUrl}
            alt="Detection result"
            onLoad={handleImgLoad}
            className="w-full h-auto block"
            style={{ maxHeight: 600, objectFit: 'contain' }}
          />

          {/* SVG overlay for interactive box highlight */}
          {imgLoaded && showBoxes && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: imgSize.w, height: imgSize.h }}
              viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
            >
              {result.boxes.map((box, i) => {
                const x = box.x1 * imgSize.w
                const y = box.y1 * imgSize.h
                const w = (box.x2 - box.x1) * imgSize.w
                const h = (box.y2 - box.y1) * imgSize.h
                return (
                  <g key={i}>
                    <rect
                      x={x} y={y} width={w} height={h}
                      fill="none"
                      stroke="rgba(34,197,94,0.0)"
                      strokeWidth="0"
                    />
                  </g>
                )
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Per-detection table */}
      {result.boxes.length > 0 && (
        <div className="card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <Info size={13} color="var(--text-muted)" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Detection details
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Confidence', 'X1', 'Y1', 'X2', 'Y2'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.boxes.map((box, i) => (
                  <tr
                    key={i}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                    <td className="px-4 py-2">
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(34,197,94,0.2)',
                        }}
                      >
                        {(box.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    {[box.x1, box.y1, box.x2, box.y2].map((v, j) => (
                      <td key={j} className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {v.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}
