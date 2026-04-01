'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageList } from '@/components/chat/message-list'
import { ChatInputBar } from '@/components/chat/chat-input-bar'
import CameraCapture, { type CameraCaptureRef } from '@/components/camera-capture'
import { VoiceRecorder } from '@/components/voice-recorder'
import type { CapabilityFlags, DisplayMessage, RecordingState } from '@/lib/types/chat'
import { Camera } from 'lucide-react'
import AvatarPlayer from '@/components/chat/avatar-player'

interface ChatInterfaceProps {
  token: string
  initialSessionId?: string
  initialMessages?: DisplayMessage[]
}

export function ChatInterface({ token, initialSessionId, initialMessages }: ChatInterfaceProps) {
  const router = useRouter()

  const [authError, setAuthError] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages ?? [])
  const [capabilities, setCapabilities] = useState<CapabilityFlags>({
    supportsSTT: false,
    supportsTTS: false,
    supportsVision: false,
    supportsAvatar: false,
  })
  const [inputText, setInputText] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarPollCancelRef = useRef(false)

  const cameraRef = useRef<CameraCaptureRef>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load capabilities on mount
  useEffect(() => {
    if (!token) {
      setAuthError(true)
      return
    }
    async function init() {
      const capRes = await fetch(`/api/capabilities?token=${encodeURIComponent(token)}`)
      if (capRes.status === 401) {
        setAuthError(true)
        return
      }
      const cap: CapabilityFlags = await capRes.json()
      setCapabilities(cap)
    }
    init()
  }, [token])

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }

  async function pollAvatarStatus(jobId: string) {
    avatarPollCancelRef.current = false
    const INTERVAL = 2000
    const MAX_ATTEMPTS = 30
    let attempts = 0
    while (attempts < MAX_ATTEMPTS) {
      if (avatarPollCancelRef.current) return
      try {
        const res = await fetch(`/api/avatar/status?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.status === 'done' && data.videoUrl) {
          setAvatarVideoUrl(data.videoUrl)
          setAvatarLoading(false)
          return
        }
        if (data.status === 'failed') {
          setAvatarError('数字人生成失败')
          setAvatarLoading(false)
          return
        }
      } catch {
        // network error, keep retrying
      }
      attempts++
      await new Promise((r) => setTimeout(r, INTERVAL))
    }
    setAvatarError('数字人生成超时')
    setAvatarLoading(false)
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim()
    if (!text || loading) return

    avatarPollCancelRef.current = true
    setAvatarVideoUrl(null)
    setAvatarError(null)

    stopAudio()
    setInputText('')
    setLoading(true)
    setError(null)

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    const assistantId = crypto.randomUUID()
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    }
    setMessages((prev) => [...prev, assistantMsg])

    // Capture camera frame if camera is active
    const images: string[] = []
    if (cameraRef.current) {
      const frame = cameraRef.current.captureFrame()
      if (frame) images.push(frame)
    }

    try {
      const body: { sessionId?: string; message: string; images?: string[] } = { message: text }
      if (sessionId) body.sessionId = sessionId
      if (images.length > 0) body.images = images

      const res = await fetch(`/api/chat?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      // Capture session id from response header — update URL on first message
      const newSessionId = res.headers.get('X-Session-Id')
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId)
        // Silently update URL to /c/[id] so sidebar stays in sync and page is bookmark-able
        router.replace(`/c/${newSessionId}?token=${encodeURIComponent(token)}`)
      }

      // Read SSE stream
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent, streaming: true } : m
                  )
                )
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      )

      // TTS
      if (capabilities.supportsTTS && fullContent) {
        try {
          const ttsRes = await fetch(`/api/speech/tts?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fullContent }),
          })
          if (ttsRes.ok) {
            const blob = await ttsRes.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audioRef.current = audio
            audio.play().catch(() => {})
            audio.onended = () => URL.revokeObjectURL(url)
            audio.onpause = () => URL.revokeObjectURL(url)
          }
        } catch {
          // silent TTS failure
        }
      }

      // Avatar
      if (capabilities.supportsAvatar && fullContent) {
        setAvatarLoading(true)
        setAvatarError(null)
        try {
          const avatarRes = await fetch(`/api/avatar?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fullContent }),
          })
          if (avatarRes.ok) {
            const { jobId } = await avatarRes.json()
            pollAvatarStatus(jobId)
          } else {
            setAvatarError('数字人暂时不可用')
            setAvatarLoading(false)
          }
        } catch {
          setAvatarError('数字人暂时不可用')
          setAvatarLoading(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      setLoading(false)
    }
  }, [inputText, loading, sessionId, token, capabilities.supportsTTS, router])

  if (authError) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800">链接已失效</p>
          <p className="mt-1 text-sm text-gray-500">请联系管理员获取有效链接</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      {/* Camera preview — floats above message list, anchored bottom-right of input bar */}
      {capabilities.supportsVision && isCameraActive && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <CameraCapture
            ref={cameraRef}
            isActive={isCameraActive}
            onError={(msg) => { setError(msg); setIsCameraActive(false) }}
            onClose={() => setIsCameraActive(false)}
          />
        </div>
      )}

      {/* Avatar player */}
      {capabilities.supportsAvatar && (
        <div className="shrink-0 px-4">
          <AvatarPlayer
            videoUrl={avatarVideoUrl}
            loading={avatarLoading}
            error={avatarError}
          />
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-4 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      <ChatInputBar
        value={inputText}
        onChange={setInputText}
        onSend={sendMessage}
        disabled={loading || recordingState !== 'idle'}
      >
        <div className="flex gap-1 items-center">
          {capabilities.supportsVision && (
            <button
              type="button"
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isCameraActive
                  ? 'text-blue-500 bg-blue-50'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="摄像头视觉"
            >
              <Camera size={16} strokeWidth={2.5} />
            </button>
          )}
          {capabilities.supportsSTT && (
            <VoiceRecorder
              token={token}
              recordingState={recordingState}
              onStateChange={setRecordingState}
              onTranscript={(text) => { setInputText(text); sendMessage(text) }}
            />
          )}
        </div>
      </ChatInputBar>
    </div>
  )
}
