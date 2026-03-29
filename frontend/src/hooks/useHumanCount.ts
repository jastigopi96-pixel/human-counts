/**
 * useHumanCount — central state machine for the detection workflow.
 *
 * States: idle → uploading → processing → done | error
 */
import { useCallback, useReducer } from 'react'
import type { AppState, UploadedFile, ImageResult, VideoResult, VideoSSEEvent } from '@/types'
import { processImage, processVideo } from '@/services/api'

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_FILE';            payload: UploadedFile }
  | { type: 'UPLOAD_PROGRESS';     payload: number }
  | { type: 'PROCESSING_START' }
  | { type: 'PROCESSING_PROGRESS'; payload: { pct: number; unique: number } }
  | { type: 'IMAGE_DONE';          payload: ImageResult }
  | { type: 'VIDEO_DONE';          payload: VideoResult }
  | { type: 'ERROR';               payload: string }
  | { type: 'RESET' }

const initial: AppState = {
  uploaded: null,
  status: 'idle',
  uploadProgress: 0,
  processingProgress: 0,
  imageResult: null,
  videoResult: null,
  error: null,
  uniqueCountDuringProcess: 0,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...initial, uploaded: action.payload, status: 'uploading' }
    case 'UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload }
    case 'PROCESSING_START':
      return { ...state, status: 'processing', uploadProgress: 100 }
    case 'PROCESSING_PROGRESS':
      return {
        ...state,
        processingProgress: action.payload.pct,
        uniqueCountDuringProcess: action.payload.unique,
      }
    case 'IMAGE_DONE':
      return { ...state, status: 'done', imageResult: action.payload }
    case 'VIDEO_DONE':
      return {
        ...state,
        status: 'done',
        videoResult: action.payload,
        processingProgress: 100,
        uniqueCountDuringProcess: action.payload.unique_count,
      }
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload }
    case 'RESET':
      // Revoke object URL to avoid memory leak
      if (state.uploaded?.previewUrl) URL.revokeObjectURL(state.uploaded.previewUrl)
      return initial
    default:
      return state
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHumanCount() {
  const [state, dispatch] = useReducer(reducer, initial)

  const setFile = useCallback((uploaded: UploadedFile) => {
    dispatch({ type: 'SET_FILE', payload: uploaded })
  }, [])

  const run = useCallback(async (uploaded: UploadedFile) => {
    dispatch({ type: 'SET_FILE', payload: uploaded })

    try {
      if (uploaded.type === 'image') {
        // ── Image flow ─────────────────────────────────────────────────────
        const result = await processImage(uploaded.file, (pct) => {
          dispatch({ type: 'UPLOAD_PROGRESS', payload: pct })
          if (pct === 100) dispatch({ type: 'PROCESSING_START' })
        })
        dispatch({ type: 'IMAGE_DONE', payload: result })
      } else {
        // ── Video flow ─────────────────────────────────────────────────────
        let uploadDone = false

        await processVideo(
          uploaded.file,
          (pct) => {
            dispatch({ type: 'UPLOAD_PROGRESS', payload: pct })
            if (pct === 100 && !uploadDone) {
              uploadDone = true
              dispatch({ type: 'PROCESSING_START' })
            }
          },
          (event: VideoSSEEvent) => {
            if (event.type === 'progress') {
              dispatch({
                type: 'PROCESSING_PROGRESS',
                payload: { pct: event.progress, unique: event.unique_count },
              })
            } else if (event.type === 'result') {
              dispatch({ type: 'VIDEO_DONE', payload: event })
            } else if (event.type === 'error') {
              dispatch({ type: 'ERROR', payload: event.detail })
            }
          }
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error occurred'
      dispatch({ type: 'ERROR', payload: msg })
    }
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { state, run, reset }
}
