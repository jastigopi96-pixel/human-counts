// ── API response types ────────────────────────────────────────────────────────

export interface BoundingBox {
  x1: number   // normalised 0-1
  y1: number
  x2: number
  y2: number
  confidence: number
}

export interface ImageResult {
  count: number
  boxes: BoundingBox[]
  processed_image_url: string
  original_width: number
  original_height: number
}

export interface VideoResult {
  unique_count: number
  total_frames: number
  fps: number
  processed_video_url: string
  frame_counts: number[]
}

export interface VideoProgressEvent {
  type: 'progress'
  progress: number
  unique_count: number
}

export interface VideoResultEvent extends VideoResult {
  type: 'result'
}

export interface VideoErrorEvent {
  type: 'error'
  detail: string
}

export type VideoSSEEvent = VideoProgressEvent | VideoResultEvent | VideoErrorEvent

// â”€â”€ Realtime WS events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface RealtimeResultEvent {
  type: 'result'
  count: number
  boxes: BoundingBox[]
  width: number
  height: number
  timestamp: number
}

// ── App state types ───────────────────────────────────────────────────────────

export type FileType = 'image' | 'video'
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export interface UploadedFile {
  file: File
  type: FileType
  previewUrl: string
}

export interface AppState {
  uploaded: UploadedFile | null
  status: ProcessingStatus
  uploadProgress: number
  processingProgress: number
  imageResult: ImageResult | null
  videoResult: VideoResult | null
  error: string | null
  uniqueCountDuringProcess: number
}
