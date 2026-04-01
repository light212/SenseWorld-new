'use client';

import { useState } from 'react';
import type { ConfigItem } from '@/lib/types/admin';
import { McpTestButton } from '@/components/admin/McpTestButton';
import clsx from 'clsx';
import { CheckCircle2 } from 'lucide-react';

interface ConfigKeyDef {
  key: string;
  label: string;
  placeholder: string;
  sensitive?: boolean;
  multiline?: boolean;
}

const GROUPS = [
  {
    id: 'ai_core',
    title: '大模型与基盘',
    description: '设置主要的文本大语言模型服务商，全局系统设定。',
    keys: [
      { key: 'AI_PROVIDER', label: '引擎通道 (Provider)', placeholder: '推荐: openai / anthropic' },
      { key: 'AI_MODEL', label: '默认承载预训练模型', placeholder: '如: gpt-4o' },
      { key: 'AI_BASE_URL', label: '私有化中转网关 (可选)', placeholder: 'https://api.example.com/v1' },
      { key: 'AI_API_KEY', label: '控制台接入密钥', placeholder: 'sk-...', sensitive: true },
      { key: 'SYSTEM_PROMPT', label: '顶层系统引导规约 (System Prompt)', placeholder: '您是一名人设丰满的智能向导...', multiline: true },
    ]
  },
  {
    id: 'speech_stt',
    title: '语音信道',
    description: '配置录音识别 (STT) 与 文本转语音 (TTS) 接口。',
    keys: [
      { key: 'SPEECH_PROVIDER', label: '云端通信商选择', placeholder: 'azure / openai' },
      { key: 'SPEECH_API_KEY', label: '调用密钥与鉴权', placeholder: '...', sensitive: true },
    ]
  },
  {
    id: 'avatar_engine',
    title: '数字人超分',
    description: '通过 HeyGen 或 D-ID 激活视频流实时推流拟人形象。',
    keys: [
      { key: 'AVATAR_PROVIDER', label: '流媒体底层开发商', placeholder: 'heygen / did（留空为禁用拦截）' },
      { key: 'AVATAR_ACTOR_ID', label: '资产特征锚点 ID', placeholder: '填入你在第三方导出的角色 Source URL' },
      { key: 'AVATAR_API_KEY', label: '传输层 API 凭据', placeholder: '...', sensitive: true },
      { key: 'AVATAR_MAX_CHARS', label: '单轮对话生成锁 (Token 保护)', placeholder: '预设 300 字符以内' },
    ]
  },
  {
    id: 'advanced_mcp',
    title: '应用层协议扩展',
    description: '通过 Model Context Protocol 挂载公司私有知识库或外部函数栈。',
    keys: [
      { key: 'MCP_SERVER_URL', label: '局域网 MCP 工具解析 Endpoint', placeholder: 'http://mcp.internal/query' },
      { key: 'MCP_API_KEY', label: 'MCP 鉴权机密凭证', placeholder: '留下空白则为无鉴权访问...', sensitive: true },
    ]
  }
];

interface Props {
  initialConfigs: ConfigItem[];
}

export default function ConfigForm({ initialConfigs }: Props) {
  const initValues: Record<string, string> = {};
  for (const item of initialConfigs) {
    initValues[item.key] = item.value;
  }

  const [activeTab, setActiveTab] = useState(GROUPS[0].id);
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
      setMessage('表单未发生改变。');
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
        setMessage('✅ 更改已无缝热重载至全服');
        setEditing({});
        setTimeout(() => setMessage(''), 3000); // clear after 3s
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
        setMessage(`❌ 节点通讯异常: ${data.error}`);
      }
    } catch {
      setMessage('❌ 网络丢包，连接失败');
    } finally {
      setSaving(false);
    }
  }

  const inputStyles = "w-full bg-transparent border-b border-slate-200 py-3 text-[15px] text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 font-medium";
  const activeGroup = GROUPS.find(g => g.id === activeTab)!;

  return (
    <div className="@container w-full animate-in fade-in duration-500">
      {/* Top Header & Save Button */}
      <div className="flex flex-col @3xl:flex-row @3xl:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
           <h2 className="text-3xl font-bold text-slate-900 tracking-tight">系统运维</h2>
           <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">平台核心参数 / 配置调度</p>
        </div>
        <div className="flex items-center gap-4">
           {message && (
            <span className={clsx("text-xs font-bold px-4 py-2 flex items-center gap-2", message.includes('✅') ? "text-emerald-700" : "text-rose-600")}>
              {message}
            </span>
           )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white px-8 py-3 hover:bg-slate-800 transition-colors text-[12px] font-bold tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 rounded-none"
          >
            {saving ? '同步网络...' : '发布更改'}
            {!saving && <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editorial Grid / Asymmetric Layout */}
      <div className="grid grid-cols-1 @4xl:grid-cols-[240px_1fr] gap-12 @6xl:gap-24 relative">
        
        {/* Left Column: Vertical Navigation (replaces horizontal tabs) */}
        <div className="flex flex-row @4xl:flex-col overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-2 @4xl:gap-1 @4xl:sticky top-8 h-fit z-10 -mx-4 px-4 @4xl:mx-0 @4xl:px-0 py-2 @4xl:py-0">
          {GROUPS.map((group) => {
            const isActive = activeTab === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveTab(group.id)}
                className={clsx(
                  "flex-shrink-0 text-left px-5 py-3 @4xl:py-4 text-[13px] font-bold tracking-widest transition-all duration-300 flex items-center gap-3 @4xl:gap-4 group rounded-full @4xl:rounded-none",
                  isActive 
                    ? "text-slate-900 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] @4xl:shadow-[0_2px_12px_rgba(0,0,0,0.03)]" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                )}
              >
                <span className={clsx("w-1.5 h-1.5 rounded-full transition-all duration-300", isActive ? "bg-slate-900" : "bg-transparent group-hover:bg-slate-300")} />
                {group.title}
              </button>
            );
          })}
        </div>

        {/* Right Column: Form Fields */}
        <div className="flex flex-col gap-12">
          <div className="pb-8 border-b border-slate-200">
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">{activeGroup.title}</h3>
             <p className="text-[14px] text-slate-500 mt-2 max-w-xl leading-relaxed">{activeGroup.description}</p>
          </div>
          
          <div className="space-y-12">
             {activeGroup.keys.map(({ key, label, placeholder, sensitive, multiline }) => (
               <div key={key} className="flex flex-col gap-2 group">
                 <label className="flex items-center gap-3">
                   <span className="text-[13px] font-bold tracking-widest text-slate-900">{label}</span>
                   {sensitive && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 tracking-widest font-bold">机密凭据</span>}
                 </label>
                 <span className="text-[11px] font-mono text-slate-400">{key}</span>

                 <div className="w-full max-w-3xl mt-2 relative">
                   {sensitive && !editing[key] ? (
                     <div className="flex items-center justify-between border-b border-slate-200 py-3">
                       <span className="text-[15px] font-mono text-slate-400 tracking-widest">••••••••••••••••</span>
                       <button
                         type="button"
                         onClick={() => toggleEdit(key)}
                         className="text-[12px] font-bold text-slate-900 hover:text-blue-600 transition-colors px-3 py-1 bg-slate-100/50 rounded"
                       >
                         修改配置项
                       </button>
                     </div>
                   ) : multiline ? (
                     <textarea
                       value={getValue(key)}
                       onChange={(e) => handleChange(key, e.target.value)}
                       placeholder={placeholder}
                       rows={4}
                       className={clsx(inputStyles, 'resize-y min-h-[120px] leading-relaxed')}
                     />
                   ) : (
                     <div className="w-full">
                       <input
                         type={sensitive ? 'password' : 'text'}
                         value={getValue(key)}
                         onChange={(e) => handleChange(key, e.target.value)}
                         placeholder={sensitive ? '键入新鉴权凭据将覆盖线上逻辑...' : placeholder}
                         className={inputStyles}
                       />
                       {key === 'MCP_SERVER_URL' && (
                         <div className="mt-4">
                           <McpTestButton currentUrl={getValue(key)} currentApiKey={getValue('MCP_API_KEY')} />
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
