'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { Mic2, PhoneOff, Loader2 } from 'lucide-react'

type CallState = 'idle' | 'connecting' | 'active' | 'ending'

interface RealtimeVoiceButtonProps {
  token: string
  sessionId?: string
  systemPrompt?: string
  onSessionCreated?: (id: string) => void
  onNewMessages?: (msgs: Array<{ role: string; content: string }>) => void
}

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
}

export function RealtimeVoiceButton({
  token,
  sessionId,
  systemPrompt,
  onSessionCreated,
  onNewMessages,
}: RealtimeVoiceButtonProps) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const transcriptRef = useRef<TranscriptMessage[]>([])
  const currentSessionIdRef = useRef<string | null>(sessionId || null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  // Save transcript on call end
  const saveTranscript = useCallback(async () => {
    const messages = transcriptRef.current
    if (messages.length === 0) return

    try {
      const res = await fetch(
        `/api/chat/messages?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionIdRef.current,
            messages,
          }),
        }
      )
      const data = await res.json()
      if (data.saved && onNewMessages) {
        onNewMessages(messages)
      }
    } catch (err) {
      console.error('Failed to save transcript:', err)
    }
  }, [token, onNewMessages])

  // Handle incoming audio from xAI
  const playAudio = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return

    const binaryString = atob(base64Audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    audioContextRef.current.decodeAudioData(bytes.buffer, (audioBuffer) => {
      const source = audioContextRef.current!.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current!.destination)
      source.start()
    })
  }, [])

  // Start the realtime call
  const startCall = useCallback(async () => {
    setError(null)
    setCallState('connecting')
    transcriptRef.current = []

    try {
      // 1. Get ephemeral token
      const tokenRes = await fetch(
        `/api/speech/realtime-session?token=${encodeURIComponent(token)}`,
        { method: 'POST' }
      )
      if (!tokenRes.ok) {
        throw new Error('Failed to get realtime session token')
      }
      const { ephemeralToken } = await tokenRes.json()
      if (!ephemeralToken) {
        throw new Error('No ephemeral token received')
      }

      // 2. Create session if needed
      if (!currentSessionIdRef.current) {
        const sessionRes = await fetch(
          `/api/chat?token=${encodeURIComponent(token)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [] }),
          }
        )
        const sessionData = await sessionRes.json()
        // The session ID is returned in the header or body
        const newSessionId = sessionRes.headers.get('X-Session-Id') || sessionData.sessionId
        if (newSessionId) {
          currentSessionIdRef.current = newSessionId
          onSessionCreated?.(newSessionId)
        }
      }

      // 3. Initialize AudioContext and request microphone
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // Register AudioWorklet processor inline via Blob URL (avoids separate .js file)
      const processorCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const channel = inputs[0]?.[0]
            if (channel) this.port.postMessage(channel)
            return true
          }
        }
        registerProcessor('pcm-processor', PCMProcessor)
      `
      const blob = new Blob([processorCode], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)
      await audioContextRef.current.audioWorklet.addModule(workletUrl)
      URL.revokeObjectURL(workletUrl)

      // 4. Connect WebSocket
      const wsUrl = `wss://api.x.ai/v1/realtime?model=grok-2-audio`
      const ws = new WebSocket(wsUrl)

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        // Send session config
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: systemPrompt || 'You are a helpful assistant.',
              voice: 'eve',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad' },
            },
            _auth_token: ephemeralToken,
          })
        )

        // Wire up AudioWorklet PCM capture
        const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!)
        const workletNode = new AudioWorkletNode(audioContextRef.current!, 'pcm-processor')

        workletNode.port.onmessage = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const inputData: Float32Array = e.data
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }
          const bytes = new Uint8Array(pcmData.buffer)
          const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(binary) }))
        }

        source.connect(workletNode)
        workletNodeRef.current = workletNode
        setCallState('active')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle different event types
          if (data.type === 'response.audio_transcript.delta') {
            // Text transcript of AI response
            const existing = transcriptRef.current.find(
              (m) => m.role === 'assistant' && m.content.endsWith('...')
            )
            if (existing) {
              existing.content = existing.content.replace('...', '') + data.delta
            } else {
              transcriptRef.current.push({ role: 'assistant', content: data.delta })
            }
          } else if (data.type === 'response.audio.delta') {
            // Audio from AI
            playAudio(data.delta)
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            // User's speech transcribed
            transcriptRef.current.push({ role: 'user', content: data.transcript })
          } else if (data.type === 'error') {
            console.error('xAI realtime error:', data.error)
            setError(data.error?.message || 'Unknown error')
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('WebSocket error:', err)
        setError('Connection error')
        setCallState('idle')
        cleanup()
      }

      ws.onclose = () => {
        setCallState('idle')
      }

      wsRef.current = ws
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start call'
      setError(msg)
      setCallState('idle')
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, systemPrompt, cleanup, playAudio, onSessionCreated])

  // End the call
  const endCall = useCallback(async () => {
    setCallState('ending')

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Cleanup audio
    cleanup()

    // Save transcript
    await saveTranscript()

    setCallState('idle')
  }, [cleanup, saveTranscript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={callState === 'active' ? endCall : startCall}
        disabled={callState === 'connecting' || callState === 'ending'}
        className={clsx(
          'flex items-center justify-center w-8 h-8 transition-colors duration-150',
          callState === 'active'
            ? 'text-slate-900 hover:text-slate-600'
            : callState === 'connecting' || callState === 'ending'
            ? 'text-slate-300 cursor-wait'
            : 'text-slate-400 hover:text-slate-700'
        )}
        title={callState === 'active' ? '结束通话' : '实时通话'}
      >
        {callState === 'idle' && <Mic2 size={18} />}
        {callState === 'connecting' && <Loader2 size={18} className="animate-spin" />}
        {callState === 'active' && <PhoneOff size={18} />}
        {callState === 'ending' && <Loader2 size={18} className="animate-spin" />}
      </button>
      {error && (
        <span className="text-xs text-red-500 max-w-[120px] text-center">{error}</span>
      )}
      {callState === 'active' && (
        <span className="text-xs text-slate-500">通话中...</span>
      )}
    </div>
  )
}