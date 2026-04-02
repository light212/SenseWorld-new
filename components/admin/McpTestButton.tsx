'use client'

import { useState } from 'react'
import { Plug, PlugZap, Loader2, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'

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
      if (res.status === 401) {
        setState('error')
        setMessage('登录已过期，请重新登录')
        setTimeout(() => { window.location.href = '/admin/login' }, 1500)
        return
      }
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
    <div className="flex items-center gap-3 mt-1">
      <button
        type="button"
        onClick={handleTest}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-widest transition-all duration-200 rounded border disabled:opacity-40 disabled:cursor-not-allowed',
          state === 'success'
            ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            : state === 'error'
              ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
              : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
        )}
      >
        {state === 'loading' ? (
          <><Loader2 size={13} className="animate-spin" /> 测试中…</>
        ) : state === 'success' ? (
          <><PlugZap size={13} /> 已连通</>
        ) : state === 'error' ? (
          <><XCircle size={13} /> 重新测试</>
        ) : (
          <><Plug size={13} /> 测试连接</>
        )}
      </button>

      {state === 'success' && (
        <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
          <CheckCircle size={13} className="text-emerald-500" />
          {message}
        </span>
      )}

      {state === 'error' && (
        <span className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium">
          <XCircle size={13} />
          {message}
        </span>
      )}
    </div>
  )
}
