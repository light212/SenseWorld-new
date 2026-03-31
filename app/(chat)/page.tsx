'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageList } from '@/components/chat/message-list'
import { ChatInputBar } from '@/components/chat/chat-input-bar'
import CameraCapture, { type CameraCaptureRef } from '@/components/camera-capture'
import { VoiceRecorder } from '@/components/voice-recorder'
import type { CapabilityFlags, DisplayMessage, RecordingState } from '@/lib/types/chat'
import AvatarPlayer from '@/components/chat/avatar-player'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [authError, setAuthError] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [capabilities, setCapabilities] = useState<CapabilityFlags>({
    supportsSTT: false,
    supportsTTS: false,
    supportsVision: false,
    supportsAvatar: false,
  })
  const [inputText, setInputText] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarPollCancelRef = useRef(false)

  const cameraRef = useRef<CameraCaptureRef>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load capabilities and history on mount
  useEffect(() => {
    if (!token) {
      setAuthError(true)
      return
    }
    async function init() {
      // Load capabilities
      const capRes = await fetch(`/api/capabilities?token=${encodeURIComponent(token)}`)
      if (capRes.status === 401) {
        setAuthError(true)
        return
      }
      const cap: CapabilityFlags = await capRes.json()
      setCapabilities(cap)

      // Load history if sessionId in URL
      const sid = new URLSearchParams(window.location.search).get('sessionId')
      if (sid) {
        const histRes = await fetch(
          `/api/chat?sessionId=${encodeURIComponent(sid)}&token=${encodeURIComponent(token)}`
        )
        if (histRes.ok) {
          const data = await histRes.json()
          setSessionId(data.sessionId)
          setMessages(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            }))
          )
        }
      }
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

    // Cancel any in-progress avatar poll
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

      // Capture session id from response header
      const newSessionId = res.headers.get('X-Session-Id')
      if (newSessionId && !sessionId) setSessionId(newSessionId)

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
  }, [inputText, loading, sessionId, token, capabilities.supportsTTS])

  if (authError) {
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800">链接已失效</p>
          <p className="mt-1 text-sm text-gray-500">请联系管理员获取有效链接</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Camera preview (shown above message list when active) */}
      {capabilities.supportsVision && (
        <div className="shrink-0 px-4 pt-3">
          <CameraCapture
            ref={cameraRef}
            onError={(msg) => setError(msg)}
          />
          {/* Track camera active state via a hidden callback */}
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

      {/* Input bar */}
      <ChatInputBar
        value={inputText}
        onChange={setInputText}
        onSend={sendMessage}
        disabled={loading || recordingState !== 'idle'}
      >
        {capabilities.supportsSTT && (
          <VoiceRecorder
            token={token}
            recordingState={recordingState}
            onStateChange={setRecordingState}
            onTranscript={(text) => { setInputText(text); sendMessage(text) }}
          />
        )}
      </ChatInputBar>
    </div>
  )
}
