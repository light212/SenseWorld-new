'use client';

import { useState } from 'react';
import type { ConfigItem } from '@/lib/types/admin';
import { McpTestButton } from '@/components/admin/McpTestButton';
import clsx from 'clsx';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

// Model chips per provider (UI only, not stored)
const AI_MODEL_CHIPS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  xai: ['grok-2-vision-1212', 'grok-4.20-0309-reasoning', 'grok-4.20-0309-non-reasoning'],
};

// TTS voice chips per speech provider
const TTS_VOICE_CHIPS: Record<string, string[]> = {
  openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  azure: ['zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-XiaoyiNeural'],
  xai: ['eve', 'ara', 'rex', 'sal', 'leo'],
};

const AI_PROVIDERS = ['openai', 'anthropic', 'xai'] as const;
const SPEECH_PROVIDERS = ['openai', 'azure', 'xai', ''] as const; // '' = disabled
const SPEECH_PROVIDER_LABELS: Record<string, string> = {
  openai: 'OPENAI',
  azure: 'AZURE',
  xai: 'XAI',
  '': '不启用',
};
const VOICE_MODES = ['standard', 'realtime'] as const;

// Groups for navigation - ai_core and speech_stt removed (rendered independently)
const GROUPS = [
  {
    id: 'ai_core',
    title: '大模型与基盘',
    description: '设置主要的文本大语言模型服务商，全局系统设定。',
  },
  {
    id: 'speech_stt',
    title: '语音信道',
    description: '配置录音识别 (STT) 与 文本转语音 (TTS) 接口。',
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

  // AI Provider state
  const [showAiAdvanced, setShowAiAdvanced] = useState(false);
  const aiProvider = (values['AI_PROVIDER'] || 'openai').toLowerCase();

  // Speech Provider state
  const [showSpeechAdvanced, setShowSpeechAdvanced] = useState(false);
  const speechProvider = (values['SPEECH_PROVIDER'] || '').toLowerCase();

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

  function handleAiProviderChange(provider: string) {
    setValues((prev) => ({ ...prev, ['AI_PROVIDER']: provider }));
  }

  function handleModelChipClick(model: string) {
    setValues((prev) => ({ ...prev, ['AI_MODEL']: model }));
  }

  function handleSpeechProviderChange(provider: string) {
    setValues((prev) => ({ ...prev, ['SPEECH_PROVIDER']: provider }));
  }

  function handleTtsVoiceChipClick(voice: string) {
    setValues((prev) => ({ ...prev, ['TTS_VOICE']: voice }));
  }

  function handleVoiceModeChange(mode: string) {
    setValues((prev) => ({ ...prev, ['SPEECH_VOICE_MODE']: mode }));
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
      if (res.status === 401) {
        setMessage('登录已过期，正在跳转登录页...');
        setTimeout(() => { window.location.href = '/admin/login' }, 1500);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setMessage('更改已保存并热重载至全服');
        setEditing({});
        setTimeout(() => setMessage(''), 3000);
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
        setMessage(`节点通讯异常: ${data.error}`);
      }
    } catch {
      setMessage('网络请求失败，请检查连接');
    } finally {
      setSaving(false);
    }
  }

  const inputStyles = "w-full bg-transparent border-b border-slate-200 py-3 text-[15px] text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 font-medium";
  const activeGroup = GROUPS.find(g => g.id === activeTab)!;

  // Check if a model chip is selected
  const selectedModel = getValue('AI_MODEL');
  const modelChips = AI_MODEL_CHIPS[aiProvider] || [];

  // Render AI Core section (independent from GROUPS)
  function renderAiCoreSection() {
    return (
      <div className="space-y-10">
        {/* Provider Selector */}
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold tracking-widest text-slate-900">服务商</label>
          <div className="flex gap-2 flex-wrap">
            {AI_PROVIDERS.map((provider) => {
              const isSelected = aiProvider === provider;
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleAiProviderChange(provider)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-widest transition-all duration-200",
                    isSelected
                      ? "text-slate-900 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isSelected ? "bg-slate-900" : "bg-transparent")} />
                  {provider.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3">
            <span className="text-[13px] font-bold tracking-widest text-slate-900">API 密钥</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 tracking-widest font-bold">机密凭据</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">AI_API_KEY</span>
          <div className="w-full max-w-3xl mt-2">
            {editing['AI_API_KEY'] ? (
              <input
                type="password"
                value={getValue('AI_API_KEY')}
                onChange={(e) => handleChange('AI_API_KEY', e.target.value)}
                placeholder="键入新鉴权凭据将覆盖线上逻辑..."
                className={inputStyles}
              />
            ) : (
              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="text-[15px] font-mono text-slate-400 tracking-widest">••••••••••••••••</span>
                <button
                  type="button"
                  onClick={() => toggleEdit('AI_API_KEY')}
                  className="text-[12px] font-bold text-slate-900 hover:text-blue-600 transition-colors px-3 py-1 bg-slate-100/50 rounded"
                >
                  修改配置项
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Model Selection with Chips */}
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold tracking-widest text-slate-900">模型名称</label>
          <span className="text-[11px] font-mono text-slate-400">AI_MODEL</span>
          {/* Model Chips */}
          <div className="flex gap-2 flex-wrap">
            {modelChips.map((model) => {
              const isSelected = selectedModel === model;
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleModelChipClick(model)}
                  className={clsx(
                    "text-[10px] px-2 py-0.5 tracking-widest font-bold transition-all duration-200",
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {model}
                </button>
              );
            })}
          </div>
          {/* Model Input */}
          <div className="w-full max-w-3xl mt-1">
            <input
              type="text"
              value={getValue('AI_MODEL')}
              onChange={(e) => handleChange('AI_MODEL', e.target.value)}
              placeholder="选择快捷标签或手动输入模型名称"
              className={inputStyles}
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold tracking-widest text-slate-900">系统引导规约</label>
          <span className="text-[11px] font-mono text-slate-400">SYSTEM_PROMPT</span>
          <div className="w-full max-w-3xl mt-2">
            <textarea
              value={getValue('SYSTEM_PROMPT')}
              onChange={(e) => handleChange('SYSTEM_PROMPT', e.target.value)}
              placeholder="您是一名人设丰满的智能向导..."
              rows={4}
              className={clsx(inputStyles, 'resize-y min-h-[120px] leading-relaxed')}
            />
          </div>
        </div>

        {/* Advanced Settings (only for openai/anthropic) */}
        {aiProvider !== 'xai' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowAiAdvanced(!showAiAdvanced)}
              className="flex items-center gap-2 text-[11px] text-slate-400 tracking-widest hover:text-slate-600 transition-colors"
            >
              高级设置
              {showAiAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAiAdvanced && (
              <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-200">
                <label className="text-[13px] font-bold tracking-widest text-slate-900">代理地址</label>
                <span className="text-[11px] font-mono text-slate-400">AI_BASE_URL</span>
                <div className="w-full max-w-3xl mt-1">
                  <input
                    type="text"
                    value={getValue('AI_BASE_URL')}
                    onChange={(e) => handleChange('AI_BASE_URL', e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className={inputStyles}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render Speech section (independent from GROUPS)
  function renderSpeechSection() {
    const selectedVoice = getValue('TTS_VOICE');
    const voiceChips = TTS_VOICE_CHIPS[speechProvider] || [];
    const voiceMode = getValue('SPEECH_VOICE_MODE') || 'standard';

    // When "不启用" is selected, show no fields
    if (!speechProvider) {
      return (
        <div className="text-slate-500 text-[14px] py-8">
          语音信道已禁用。选择服务商以启用 STT/TTS 功能。
        </div>
      );
    }

    return (
      <div className="space-y-10">
        {/* Provider Selector */}
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold tracking-widest text-slate-900">服务商</label>
          <div className="flex gap-2 flex-wrap">
            {SPEECH_PROVIDERS.map((provider) => {
              const isSelected = speechProvider === provider;
              return (
                <button
                  key={provider || 'disabled'}
                  type="button"
                  onClick={() => handleSpeechProviderChange(provider)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-widest transition-all duration-200",
                    isSelected
                      ? "text-slate-900 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isSelected ? "bg-slate-900" : "bg-transparent")} />
                  {SPEECH_PROVIDER_LABELS[provider]}
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3">
            <span className="text-[13px] font-bold tracking-widest text-slate-900">API 密钥</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 tracking-widest font-bold">机密凭据</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">SPEECH_API_KEY</span>
          <div className="w-full max-w-3xl mt-2">
            {editing['SPEECH_API_KEY'] ? (
              <input
                type="password"
                value={getValue('SPEECH_API_KEY')}
                onChange={(e) => handleChange('SPEECH_API_KEY', e.target.value)}
                placeholder="键入新鉴权凭据将覆盖线上逻辑..."
                className={inputStyles}
              />
            ) : (
              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="text-[15px] font-mono text-slate-400 tracking-widest">••••••••••••••••</span>
                <button
                  type="button"
                  onClick={() => toggleEdit('SPEECH_API_KEY')}
                  className="text-[12px] font-bold text-slate-900 hover:text-blue-600 transition-colors px-3 py-1 bg-slate-100/50 rounded"
                >
                  修改配置项
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Azure: Service Region */}
        {speechProvider === 'azure' && (
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold tracking-widest text-slate-900">服务区域</label>
            <span className="text-[11px] font-mono text-slate-400">SPEECH_REGION</span>
            <div className="w-full max-w-3xl mt-1">
              <input
                type="text"
                value={getValue('SPEECH_REGION')}
                onChange={(e) => handleChange('SPEECH_REGION', e.target.value)}
                placeholder="eastasia"
                className={inputStyles}
              />
            </div>
          </div>
        )}

        {/* xAI: Voice Mode Toggle */}
        {speechProvider === 'xai' && (
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-bold tracking-widest text-slate-900">交互模式</label>
            <span className="text-[11px] font-mono text-slate-400">SPEECH_VOICE_MODE</span>
            <div className="flex gap-2">
              {VOICE_MODES.map((mode) => {
                const isSelected = voiceMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleVoiceModeChange(mode)}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 text-[12px] font-bold tracking-widest transition-all duration-200",
                      isSelected
                        ? "text-slate-900 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                    )}
                  >
                    <span className={clsx("w-1.5 h-1.5 rounded-full", isSelected ? "bg-slate-900" : "bg-transparent")} />
                    {mode === 'standard' ? '标准' : '实时'}
                  </button>
                );
              })}
            </div>
            {voiceMode === 'standard' && (
              <p className="text-[11px] text-slate-400 mt-1">
                标准模式下 STT 不可用，建议使用实时模式或选择其他服务商。
              </p>
            )}
          </div>
        )}

        {/* TTS Voice Selection with Chips */}
        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold tracking-widest text-slate-900">TTS 音色</label>
          <span className="text-[11px] font-mono text-slate-400">TTS_VOICE</span>
          {/* Voice Chips */}
          <div className="flex gap-2 flex-wrap">
            {voiceChips.map((voice) => {
              const isSelected = selectedVoice === voice;
              return (
                <button
                  key={voice}
                  type="button"
                  onClick={() => handleTtsVoiceChipClick(voice)}
                  className={clsx(
                    "text-[10px] px-2 py-0.5 tracking-widest font-bold transition-all duration-200",
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {voice}
                </button>
              );
            })}
          </div>
          {/* Voice Input */}
          <div className="w-full max-w-3xl mt-1">
            <input
              type="text"
              value={getValue('TTS_VOICE')}
              onChange={(e) => handleChange('TTS_VOICE', e.target.value)}
              placeholder="选择快捷标签或手动输入音色名称"
              className={inputStyles}
            />
          </div>
        </div>

        {/* Advanced Settings (only for openai) */}
        {speechProvider === 'openai' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowSpeechAdvanced(!showSpeechAdvanced)}
              className="flex items-center gap-2 text-[11px] text-slate-400 tracking-widest hover:text-slate-600 transition-colors"
            >
              高级设置
              {showSpeechAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSpeechAdvanced && (
              <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-200">
                <label className="text-[13px] font-bold tracking-widest text-slate-900">代理地址</label>
                <span className="text-[11px] font-mono text-slate-400">SPEECH_BASE_URL</span>
                <div className="w-full max-w-3xl mt-1">
                  <input
                    type="text"
                    value={getValue('SPEECH_BASE_URL')}
                    onChange={(e) => handleChange('SPEECH_BASE_URL', e.target.value)}
                    placeholder="https://proxy.example.com/v1"
                    className={inputStyles}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

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

        {/* Left Column: Vertical Navigation */}
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

          {/* AI Core: Independent rendering */}
          {activeTab === 'ai_core' && renderAiCoreSection()}

          {/* Speech STT: Independent rendering */}
          {activeTab === 'speech_stt' && renderSpeechSection()}

          {/* Other groups: Standard rendering */}
          {activeTab !== 'ai_core' && activeTab !== 'speech_stt' && (
            <div className="space-y-12">
               {activeGroup.keys?.map(({ key, label, placeholder, sensitive }) => (
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
                             <McpTestButton currentUrl={getValue(key)} />
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
