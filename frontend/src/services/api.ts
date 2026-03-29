/**
 * API service — thin wrapper over fetch/axios.
 * All backend communication lives here; components never call fetch directly.
 */
import axios, { AxiosProgressEvent } from 'axios'
import type { ImageResult, VideoSSEEvent } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? ''  // proxy in dev, absolute in prod

export function getRealtimeWsUrl(): string {
  const base = (BASE || window.location.origin).replace(/\/$/, '')
  const wsBase = base.startsWith('https://')
    ? base.replace('https://', 'wss://')
    : base.replace('http://', 'ws://')
  return `${wsBase}/api/v1/ws/realtime`
}

// ── Image ─────────────────────────────────────────────────────────────────────

export async function processImage(
  file: File,
  onUploadProgress?: (pct: number) => void
): Promise<ImageResult> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await axios.post<ImageResult>(`${BASE}/api/v1/process-image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (e.total) onUploadProgress?.(Math.round((e.loaded / e.total) * 100))
    },
  })

  return data
}

// ── Video ─────────────────────────────────────────────────────────────────────

/**
 * Upload video and stream SSE progress events via the callback.
 * Resolves when the backend sends the final "result" event.
 */
export function processVideo(
  file: File,
  onUploadProgress: (pct: number) => void,
  onSSEEvent: (event: VideoSSEEvent) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // 1. Upload with progress
    const form = new FormData()
    form.append('file', file)

    let response: Response
    try {
      // Use fetch for streaming SSE; axios buffers the body
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/api/v1/process-video`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }

      // Wait for full response via fetch (EventSource doesn't support POST)
      const fetchResponse = await fetch(`${BASE}/api/v1/process-video`, {
        method: 'POST',
        body: form,
      })

      if (!fetchResponse.ok) {
        const err = await fetchResponse.json().catch(() => ({ detail: 'Upload failed' }))
        reject(new Error(err.detail ?? 'Upload failed'))
        return
      }

      if (!fetchResponse.body) {
        reject(new Error('No response body'))
        return
      }

      // 2. Parse SSE stream
      const reader = fetchResponse.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const dataLine = line.startsWith('data: ') ? line.slice(6) : line
          if (!dataLine.trim()) continue
          try {
            const event: VideoSSEEvent = JSON.parse(dataLine)
            onSSEEvent(event)
            if (event.type === 'result') { resolve(); return }
            if (event.type === 'error') { reject(new Error(event.detail)); return }
          } catch {
            // Non-JSON line — skip
          }
        }
      }

      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  const { data } = await axios.get(`${BASE}/health`)
  return data
}
