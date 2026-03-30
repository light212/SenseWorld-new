'use client';

import { useState } from 'react';
import QrCodeDisplay from '@/components/admin/QrCodeDisplay';
import type { AccessTokenItem } from '@/lib/types/admin';

interface Props {
  initialTokens: AccessTokenItem[];
  baseUrl: string;
}

export default function AccessTokenList({ initialTokens, baseUrl }: Props) {
  const [tokens, setTokens] = useState<AccessTokenItem[]>(initialTokens);
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrTarget, setQrTarget] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/access-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label || null,
          expiresAt: isPermanent ? null : expiresAt || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTokens((prev) => [data.data, ...prev]);
        setLabel('');
        setExpiresAt('');
        setIsPermanent(true);
        setMessage('链接已生成');
      } else {
        setMessage(data.error ?? '生成失败');
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: number, enabled: boolean) {
    const res = await fetch(`/api/admin/access-tokens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.ok) {
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/admin/access-tokens/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      if (qrTarget) setQrTarget(null);
    }
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  }

  function tokenUrl(token: string): string {
    return `${baseUrl}/?token=${token}`;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">生成新链接</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注名称（可选）</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="如：展会入口"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">有效期</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={isPermanent}
                onChange={() => setIsPermanent(true)}
              />
              永久有效
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={!isPermanent}
                onChange={() => setIsPermanent(false)}
              />
              指定到期时间
            </label>
          </div>
          {!isPermanent && (
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
              className="mt-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          )}
        </div>
        {message && (
          <p className={`text-sm ${message.includes('已生成') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
        )}
        <button
          type="submit"
          disabled={creating}
          className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {creating ? '生成中...' : '生成链接'}
        </button>
      </form>

      <div className="space-y-3">
        {tokens.length === 0 && (
          <p className="text-sm text-gray-400">暂无访客链接</p>
        )}
        {tokens.map((t) => {
          const expired = isExpired(t.expiresAt);
          const url = tokenUrl(t.token);
          return (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {t.label && <span className="text-sm font-medium text-gray-800">{t.label}</span>}
                  {expired && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">已过期</span>
                  )}
                  {!t.enabled && !expired && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已禁用</span>
                  )}
                  {t.enabled && !expired && (
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">有效</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQrTarget(qrTarget === t.token ? null : t.token)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {qrTarget === t.token ? '收起二维码' : '查看二维码'}
                  </button>
                  <button
                    onClick={() => handleToggle(t.id, !t.enabled)}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    {t.enabled ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 break-all">{url}</p>
              <p className="text-xs text-gray-400">
                {t.expiresAt ? `到期：${new Date(t.expiresAt).toLocaleString('zh-CN')}` : '永久有效'}
              </p>
              {qrTarget === t.token && (
                <div className="pt-2">
                  <QrCodeDisplay value={url} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
