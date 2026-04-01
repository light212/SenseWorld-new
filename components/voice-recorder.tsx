'use client'

import { useRef } from 'react'
import type { RecordingState } from '@/lib/types/chat'
import { Mic, Loader2 } from 'lucide-react'

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
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        isRecording
          ? 'text-red-500 bg-red-50 animate-pulse'
          : isProcessing
          ? 'text-slate-300'
          : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
      }`}
      aria-label={isRecording ? '松开发送' : '按住说话'}
    >
      {isProcessing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Mic size={16} strokeWidth={2.5} />
      )}
    </button>
  )
}
