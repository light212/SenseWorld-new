'use client'

import { useRef } from 'react'
import type { RecordingState } from '@/lib/types/chat'

interface VoiceRecorderProps {
  token: string
  recordingState: RecordingState
  onStateChange: (state: RecordingState) => void
  onTranscript: (text: string) => void
}

export function VoiceRecorder({ token, recordingState, onStateChange, onTranscript }: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      onStateChange('recording')
    } catch {
      onStateChange('idle')
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    onStateChange('processing')

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      recorder.stop()
      recorder.stream.getTracks().forEach((t) => t.stop())
    })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const form = new FormData()
    form.append('audio', blob, 'recording.webm')

    try {
      const res = await fetch(`/api/speech/stt?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        body: form,
      })
      if (res.ok) {
        const data = await res.json()
        if (data.text) onTranscript(data.text)
      }
    } catch {
      // silent failure
    } finally {
      onStateChange('idle')
    }
  }

  const isRecording = recordingState === 'recording'
  const isProcessing = recordingState === 'processing'

  return (
    <button
      type="button"
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={(e) => { e.preventDefault(); startRecording() }}
      onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
      disabled={isProcessing}
      className={`shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
        isRecording
          ? 'bg-red-500 text-white'
          : isProcessing
          ? 'bg-gray-300 text-gray-400'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      aria-label={isRecording ? '松开发送' : '按住说话'}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  )
}
