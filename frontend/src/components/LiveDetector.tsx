import { useEffect, useRef, useState } from 'react'
import { getRealtimeWsUrl } from '@/services/api'
import type { BoundingBox } from '@/types'

type LiveStatus = 'idle' | 'starting' | 'live' | 'error'

function drawBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: BoundingBox[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#22c55e'
  ctx.fillStyle = 'rgba(34,197,94,0.15)'
  ctx.font = '12px Space Grotesk, sans-serif'
  ctx.shadowColor = 'rgba(34,197,94,0.6)'
  ctx.shadowBlur = 8

  boxes.forEach((b) => {
    const x = b.x1 * width
    const y = b.y1 * height
    const w = (b.x2 - b.x1) * width
    const h = (b.y2 - b.y1) * height
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    const label = `${Math.round(b.confidence * 100)}%`
    ctx.fillStyle = '#0a0e0f'
    ctx.fillRect(x, y - 16, ctx.measureText(label).width + 8, 16)
    ctx.fillStyle = '#e8f0ed'
    ctx.fillText(label, x + 4, y - 4)
    ctx.fillStyle = 'rgba(34,197,94,0.15)'
  })
}

export default function LiveDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)

  const [status, setStatus] = useState<LiveStatus>('idle')
  const [count, setCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const stop = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    setStatus('idle')
    setFps(0)
  }

  const start = async () => {
    setError(null)
    setStatus('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && overlayRef.current) {
            overlayRef.current.width = videoRef.current.videoWidth
            overlayRef.current.height = videoRef.current.videoHeight
          }
        }
        await videoRef.current.play()
      }

      const ws = new WebSocket(getRealtimeWsUrl())
      socketRef.current = ws

      ws.onopen = () => {
        setStatus('live')

        const tickMs = 180
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !captureRef.current || !socketRef.current) return
          if (socketRef.current.readyState !== WebSocket.OPEN) return
          if (inFlightRef.current) return

          const video = videoRef.current
          const capture = captureRef.current

          if (video.videoWidth === 0 || video.videoHeight === 0) return
          capture.width = video.videoWidth
          capture.height = video.videoHeight

          const ctx = capture.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0, capture.width, capture.height)

          inFlightRef.current = true
          capture.toBlob(
            (blob) => {
              if (!blob || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                inFlightRef.current = false
                return
              }
              blob.arrayBuffer().then((buf) => {
                socketRef.current?.send(buf)
                inFlightRef.current = false
              })
            },
            'image/jpeg',
            0.7
          )
        }, tickMs)
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type !== 'result') return
          setCount(payload.count ?? 0)

          const overlay = overlayRef.current
          if (overlay) {
            overlay.width = payload.width ?? overlay.width
            overlay.height = payload.height ?? overlay.height
            const ctx = overlay.getContext('2d')
            if (ctx) {
              drawBoxes(ctx, payload.boxes ?? [], overlay.width, overlay.height)
            }
          }

          if (payload.timestamp) {
            const now = payload.timestamp * 1000
            const prev = lastTsRef.current
            if (prev) {
              const diff = now - prev
              if (diff > 0) {
                const inst = 1000 / diff
                setFps((f) => Math.round((f * 0.6 + inst * 0.4) * 10) / 10)
              }
            }
            lastTsRef.current = now
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onerror = () => {
        stop()
        setError('Realtime connection failed')
        setStatus('error')
      }

      ws.onclose = () => {
        setStatus('idle')
      }
    } catch (err) {
      stop()
      const msg = err instanceof Error ? err.message : 'Unable to access camera'
      setError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    return () => stop()
  }, [])

  return (
    <div className="card card-hover p-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(600px 300px at 10% 0%, rgba(34,197,94,0.15), transparent 60%)',
      }} />

      <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300">Live Detector</p>
          <h2 className="text-lg font-semibold">Realtime Human Detection</h2>
          <p className="text-xs text-emerald-200/70">Webcam -&gt; WebSocket -&gt; YOLOv8</p>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'live' ? (
            <button className="btn-primary" onClick={start} disabled={status === 'starting'}>
              {status === 'starting' ? 'Starting...' : 'Start Camera'}
            </button>
          ) : (
            <button className="btn-ghost" onClick={stop}>Stop</button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="stat-block">
          <p className="text-xs text-emerald-200/70">Status</p>
          <p className="text-sm font-semibold">{status}</p>
        </div>
        <div className="stat-block">
          <p className="text-xs text-emerald-200/70">Live Count</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <div className="stat-block">
          <p className="text-xs text-emerald-200/70">FPS</p>
          <p className="text-2xl font-bold">{fps}</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-300 border border-red-400/30 bg-red-500/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border border-emerald-400/20">
        <video ref={videoRef} className="w-full h-auto block" playsInline muted />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      <canvas ref={captureRef} className="hidden" />
    </div>
  )
}
