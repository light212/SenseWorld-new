'use client'

import { useState } from 'react'

type MCPTestState = 'idle' | 'loading' | 'success' | 'error'

export function McpTestButton({ currentUrl }: { currentUrl: string }) {
  const [state, setState] = useState<MCPTestState>('idle')
  const [message, setMessage] = useState('')

  async function handleTest() {
    setState('loading')
    setMessage('')
    try {
      const res = await fetch('/api/admin/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setState('success')
        setMessage(data.message ?? '连接成功')
      } else {
        setState('error')
        setMessage(data.message ?? '连接失败')
      }
    } catch {
      setState('error')
      setMessage('网络错误')
    }
  }

  const disabled = !currentUrl.trim() || state === 'loading'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleTest}
        disabled={disabled}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? '测试中…' : '测试连接'}
      </button>
      {state === 'success' && (
        <span className="text-sm text-green-600">✓ {message}</span>
      )}
      {state === 'error' && (
        <span className="text-sm text-red-600">✗ {message}</span>
      )}
    </div>
  )
}
