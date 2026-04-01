'use client'

import { useRef, useState } from 'react'
import CameraCapture, { type CameraCaptureRef } from '@/components/camera-capture'

export default function TestVisionPage() {
  const cameraRef = useRef<CameraCaptureRef>(null)
  const [token, setToken] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!message.trim() || !token.trim()) return
    setLoading(true)
    setError(null)

    const imageBase64 = cameraRef.current?.captureFrame() ?? null
    const body: Record<string, unknown> = { message, ...(sessionId ? { sessionId } : {}) }
    if (imageBase64) body.images = [imageBase64]

    try {
      const res = await fetch(`/api/chat?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `HTTP ${res.status}`)
        return
      }

      if (!sessionId) {
        const sid = res.headers.get('X-Session-Id')
        if (sid) setSessionId(sid)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let reply = ''
      setOutput((prev) => [...prev, `You: ${message}${imageBase64 ? ' [📷]' : ''}`])
      setMessage('')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) reply += parsed.text
            if (parsed.error) setError(parsed.error)
          } catch {}
        }
      }

      if (reply) setOutput((prev) => [...prev, `AI: ${reply}`])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Vision 测试页</h1>

      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-2 py-1 flex-1 text-sm"
          placeholder="Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {sessionId && (
          <span className="text-xs text-gray-500">Session: {sessionId.slice(0, 8)}…</span>
        )}
      </div>

      <CameraCapture ref={cameraRef} isActive={true} onError={(msg) => setError(msg)} />

      {error && (
        <div className="text-red-600 text-sm border border-red-300 rounded p-2">{error}</div>
      )}

      <div className="border rounded p-3 min-h-40 bg-gray-50 text-sm flex flex-col gap-1 overflow-y-auto">
        {output.length === 0 && <span className="text-gray-400">对话内容将显示在此处…</span>}
        {output.map((line, i) => (
          <p key={i} className={line.startsWith('AI:') ? 'text-blue-700' : ''}>{line}</p>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="输入消息，如「你看到了什么？」"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !token.trim() || !message.trim()}
          className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? '…' : '发送'}
        </button>
      </div>
    </main>
  )
}
