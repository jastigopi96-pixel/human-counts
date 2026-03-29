/**
 * VideoResult — annotated video player, unique count, and per-frame chart.
 */
import { motion } from 'framer-motion'
import { Users, Film, Download, BarChart2, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { VideoResult as IVideoResult } from '@/types'

interface Props {
  result: IVideoResult
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Downsample frame_counts for the chart (max 300 points)
function downsample(arr: number[], maxPoints: number): { frame: number; count: number }[] {
  if (arr.length <= maxPoints) return arr.map((c, i) => ({ frame: i + 1, count: c }))
  const step = Math.ceil(arr.length / maxPoints)
  return arr
    .filter((_, i) => i % step === 0)
    .map((c, i) => ({ frame: i * step + 1, count: c }))
}

// Custom tooltip
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[]; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-mono"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-bright)',
        color: 'var(--text-primary)',
      }}
    >
      <span style={{ color: 'var(--accent)' }}>{payload[0].value}</span>
      <span style={{ color: 'var(--text-muted)' }}> persons</span>
    </div>
  )
}

export default function VideoResultPanel({ result }: Props) {
  const videoUrl   = `${API_BASE}${result.processed_video_url}`
  const chartData  = downsample(result.frame_counts, 300)
  const maxInFrame = Math.max(...result.frame_counts, 0)
  const duration   = result.total_frames / result.fps

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Unique persons', value: result.unique_count, icon: <Users size={14} />, accent: true },
          { label: 'Total frames',   value: result.total_frames, icon: <Film size={14} />,  accent: false },
          { label: 'Max in frame',   value: maxInFrame,          icon: <BarChart2 size={14} />, accent: false },
          {
            label: 'Duration',
            value: duration < 60
              ? `${duration.toFixed(1)}s`
              : `${Math.floor(duration / 60)}m ${(duration % 60).toFixed(0)}s`,
            icon: <Clock size={14} />,
            accent: false,
          },
        ].map((s) => (
          <div key={s.label} className="stat-block">
            <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--text-muted)' }}>
              {s.icon}
              <span className="text-xs">{s.label}</span>
            </div>
            <p
              className="text-2xl font-bold font-mono"
              style={{ color: s.accent ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Video player */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Film size={14} color="var(--accent)" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Processed video — {result.unique_count} unique {result.unique_count === 1 ? 'person' : 'persons'}
            </span>
          </div>
          <a href={videoUrl} download className="btn-primary text-xs py-1.5 px-3">
            <Download size={13} />
            Download
          </a>
        </div>
        <div className="bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full"
            style={{ maxHeight: 520 }}
          />
        </div>
      </div>

      {/* Per-frame chart */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <BarChart2 size={13} color="var(--text-muted)" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Persons visible per frame
          </span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="frame"
                tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-bright)' }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
