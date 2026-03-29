import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { checkHealth } from '@/services/api'

export default function Header() {
  const [healthy, setHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    checkHealth()
      .then((r) => setHealthy(r.model_loaded))
      .catch(() => setHealthy(false))
  }, [])

  return (
    <header
      className="border-b sticky top-0 z-50 backdrop-blur-sm"
      style={{
        borderColor: 'var(--border)',
        background: 'rgba(10,14,15,0.85)',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-glow)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            {/* Simple grid icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="var(--accent)" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="var(--accent)" opacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="var(--accent)" opacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="var(--accent)" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-base" style={{ color: 'var(--text-primary)' }}>
            Human<span style={{ color: 'var(--accent)' }}>Count</span>
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded font-mono hidden sm:inline"
            style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
          >
            v1.0
          </span>
        </motion.div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: healthy === null ? 'var(--text-dim)' : healthy ? 'var(--accent)' : 'var(--red)',
                boxShadow: healthy ? '0 0 6px var(--accent)' : 'none',
              }}
            />
            <span>
              {healthy === null ? 'Connecting…' : healthy ? 'Model ready' : 'Offline'}
            </span>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full hidden sm:inline"
            style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
          >
            YOLOv8 · ByteTrack
          </span>
        </div>
      </div>
    </header>
  )
}
