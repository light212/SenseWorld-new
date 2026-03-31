'use client';

import { useState } from 'react';
import type { ConfigItem } from '@/lib/types/admin';
import { McpTestButton } from '@/components/admin/McpTestButton';

interface ConfigKeyDef {
  key: string;
  label: string;
  placeholder: string;
  sensitive?: boolean;
  multiline?: boolean;
}

const CONFIG_KEYS: ConfigKeyDef[] = [
  { key: 'AI_PROVIDER', label: 'AI 服务商', placeholder: 'openai / anthropic' },
  { key: 'AI_API_KEY', label: 'AI API Key', placeholder: 'sk-...', sensitive: true },
  { key: 'AI_MODEL', label: 'AI 模型', placeholder: 'gpt-4o' },
  { key: 'AI_BASE_URL', label: 'AI Base URL（可选）', placeholder: 'https://api.example.com/v1' },
  { key: 'SPEECH_PROVIDER', label: '语音服务商', placeholder: 'azure / google' },
  { key: 'SPEECH_API_KEY', label: '语音 API Key', placeholder: '...', sensitive: true },
  { key: 'AVATAR_PROVIDER', label: 'Avatar 服务商', placeholder: 'heygen / did（留空关闭）' },
  { key: 'AVATAR_API_KEY', label: 'Avatar API Key', placeholder: '...', sensitive: true },
  { key: 'AVATAR_ACTOR_ID', label: 'Avatar 形象 ID', placeholder: 'HeyGen avatar_id 或 D-ID source_url' },
  { key: 'AVATAR_MAX_CHARS', label: 'Avatar 文本上限（字符）', placeholder: '300' },
  { key: 'MCP_SERVER_URL', label: 'MCP Server URL', placeholder: 'http://mcp.internal/query' },
  { key: 'SYSTEM_PROMPT', label: 'System Prompt', placeholder: 'You are a helpful assistant.', multiline: true },
];

interface Props {
  initialConfigs: ConfigItem[];
}

export default function ConfigForm({ initialConfigs }: Props) {
  const initValues: Record<string, string> = {};
  for (const item of initialConfigs) {
    initValues[item.key] = item.value;
  }

  const [values, setValues] = useState<Record<string, string>>(initValues);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function getValue(key: string): string {
    return values[key] ?? '';
  }

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleEdit(key: string) {
    setEditing((prev) => ({ ...prev, [key]: !prev[key] }));
    setValues((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const configs = Object.entries(values)
      .filter(([, v]) => v !== '')
      .map(([key, value]) => ({ key, value }));

    if (configs.length === 0) {
      setMessage('没有需要保存的更改');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('保存成功，配置已生效');
        setEditing({});
        const refreshed = await fetch('/api/admin/config');
        const refreshedData = await refreshed.json();
        if (refreshedData.ok) {
          const newValues: Record<string, string> = {};
          for (const item of refreshedData.data as ConfigItem[]) {
            newValues[item.key] = item.value;
          }
          setValues(newValues);
        }
      } else {
        setMessage(data.error ?? '保存失败');
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {CONFIG_KEYS.map(({ key, label, placeholder, sensitive, multiline }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          {sensitive && !editing[key] ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getValue(key)}
                readOnly
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
              <button
                type="button"
                onClick={() => toggleEdit(key)}
                className="text-xs text-blue-600 hover:underline"
              >
                修改
              </button>
            </div>
          ) : multiline ? (
            <textarea
              value={getValue(key)}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          ) : (
            <>
              <input
                type={sensitive ? 'password' : 'text'}
                value={getValue(key)}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={sensitive ? '输入新值以覆盖' : placeholder}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              {key === 'MCP_SERVER_URL' && (
                <div className="mt-2">
                  <McpTestButton currentUrl={getValue(key)} />
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {message && (
        <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存配置'}
      </button>
    </form>
  );
}
