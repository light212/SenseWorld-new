'use client';

import { useState } from 'react';
import QrCodeDisplay from '@/components/admin/QrCodeDisplay';
import type { AccessTokenItem } from '@/lib/types/admin';
import clsx from 'clsx';
import { Copy, Check, QrCode, Plus } from 'lucide-react';

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
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

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
      } else {
        alert(`❌ ${data.error ?? '无法注册该凭证'}`);
      }
    } catch {
      alert('❌ 网络中断，请检查局域网连接');
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
    if (!confirm('物理擦除不可逆，是否继续？')) return;
    const res = await fetch(`/api/admin/access-tokens/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      if (qrTarget) setQrTarget(null);
    }
  }

  const handleCopy = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  function isExpired(expAt: string | null): boolean {
    if (!expAt) return false;
    return new Date(expAt) <= new Date();
  }

  function tokenUrl(token: string): string {
    return `${baseUrl}/?token=${token}`;
  }

  const inputStyles = "w-full bg-transparent border-b border-slate-200 py-3 text-[15px] text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 font-bold";

  return (
    <div className="@container w-full animate-in fade-in duration-500 max-w-7xl">
      
      {/* Top Header */}
      <div className="flex flex-col @3xl:flex-row @3xl:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
           <h2 className="text-3xl font-bold text-slate-900 tracking-tight">访问控制</h2>
           <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">网络端点与凭证分发</p>
        </div>
      </div>

      <div className="grid grid-cols-1 @4xl:grid-cols-[300px_1fr] gap-12 @6xl:gap-24 relative">
        
        {/* Left Form: Create Endpoint */}
        <div className="flex flex-col gap-6 sticky top-8 h-fit pb-12">
          <div className="border border-slate-200 bg-white p-6 shadow-sm z-10">
            <h3 className="text-sm font-bold text-slate-900 tracking-wide mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4" /> 颁发新网关节点
            </h3>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold tracking-widest text-slate-500 mb-1">隧道标签 (备注名)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="如：第二会议室中控"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-widest text-slate-500 mb-2">生命周期 (TTL)</label>
                <div className="flex items-center p-1 bg-slate-100/80 rounded w-full">
                  <button
                    type="button"
                    onClick={() => setIsPermanent(true)}
                    className={clsx("flex-1 px-2 py-1.5 text-[11px] font-bold tracking-widest transition-all", isPermanent ? "bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" : "text-slate-400 hover:text-slate-600")}
                  >
                    无期限配置
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPermanent(false)}
                    className={clsx("flex-1 px-2 py-1.5 text-[11px] font-bold tracking-widest transition-all", !isPermanent ? "bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.05)]" : "text-slate-400 hover:text-slate-600")}
                  >
                    限时销毁约束
                  </button>
                </div>
              </div>

              {!isPermanent && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[11px] font-bold tracking-widest text-slate-500 mb-1">失效时间限制</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    required
                    className={inputStyles}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-slate-900 text-white py-4 mt-2 hover:bg-slate-800 transition-colors text-[13px] font-bold tracking-widest disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {creating ? '节点装配中...' : '部署并下发令牌'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Content: Endpoints Table */}
        <div className="flex flex-col gap-8 relative z-0">
           <div className="pb-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">全网活跃节点</h3>
              <span className="text-[11px] font-bold tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">已登记 {tokens.length} 项</span>
           </div>
           
           <div className="w-full overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead>
                 <tr>
                   <th className="pb-4 pt-2 px-2 text-[11px] font-bold tracking-widest text-slate-400 border-b border-slate-200">寻址标识号</th>
                   <th className="pb-4 pt-2 px-2 text-[11px] font-bold tracking-widest text-slate-400 border-b border-slate-200">物理位置标识</th>
                   <th className="pb-4 pt-2 px-2 text-[11px] font-bold tracking-widest text-slate-400 border-b border-slate-200">拦截器状态</th>
                   <th className="pb-4 pt-2 px-2 text-[11px] font-bold tracking-widest text-slate-400 border-b border-slate-200">终端长连接地址码</th>
                   <th className="pb-4 pt-2 px-2 text-[11px] font-bold tracking-widest text-slate-400 border-b border-slate-200 text-right">人工越权</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-slate-900">
                 {tokens.length === 0 && (
                   <tr>
                     <td colSpan={5} className="py-16 text-center text-slate-400 font-bold tracking-widest text-[12px]">
                       安全网关无负载，当前未颁发任何准入凭据。
                     </td>
                   </tr>
                 )}
                 {tokens.map((t) => {
                   const expired = isExpired(t.expiresAt);
                   const url = tokenUrl(t.token);
                   
                   const statusClass = expired 
                     ? 'bg-rose-50 text-rose-600' 
                     : (!t.enabled ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600');
                   const statusText = expired ? '时间超限' : (!t.enabled ? '人为熔断' : '安全合规');

                   return (
                     <tr key={t.id} className="group transition-colors hover:bg-slate-50">
                       <td className="px-2 py-5 font-mono text-[13px] font-semibold text-slate-400">
                         #{t.id}
                       </td>
                       <td className="px-2 py-5">
                         <div className="flex flex-col gap-1">
                           <span className="font-bold text-[14px]">
                             {t.label || <span className="text-slate-300 font-medium italic">未标记的终端节点</span>}
                           </span>
                           <span className="text-[11px] tracking-widest text-slate-400 font-bold">
                             {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '∞ 无限期授权'}
                           </span>
                         </div>
                       </td>
                       <td className="px-2 py-5">
                         <span className={clsx("text-[9px] font-extrabold px-2 py-1 rounded-sm tracking-widest", statusClass)}>
                           {statusText}
                         </span>
                       </td>
                       <td className="px-2 py-5 relative max-w-[200px]">
                         <div className="flex items-center gap-3">
                           <span className="text-slate-500 text-xs font-mono font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
                             ...{url.slice(-18)}
                           </span>
                           <button 
                             className="text-slate-300 hover:text-slate-900 transition-colors"
                             onClick={() => handleCopy(t.id, url)}
                             title="拷贝连接桥"
                           >
                             {copiedId === t.id ? <Check className="w-[14px] h-[14px] text-emerald-500" /> : <Copy className="w-[14px] h-[14px]" />}
                           </button>
                           <button
                             className={clsx("text-slate-300 hover:text-slate-900 transition-colors", qrTarget === t.token && "text-slate-900")}
                             onClick={() => setQrTarget(qrTarget === t.token ? null : t.token)}
                             title="投影至移动端扫描仪"
                           >
                             <QrCode className="w-[14px] h-[14px]" />
                           </button>
                         </div>
                         
                         {qrTarget === t.token && (
                           <div className="absolute left-0 bottom-full mb-2 z-50 bg-white p-4 border border-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                             <div className="flex justify-end mb-2">
                               <button onClick={() => setQrTarget(null)} className="text-[11px] font-bold tracking-widest text-slate-400 hover:text-slate-900">关闭面板</button>
                             </div>
                             <QrCodeDisplay value={url} />
                             <div className="text-center text-[10px] font-bold tracking-widest text-slate-400 mt-3 pt-2 border-t border-slate-100">
                               要求现场物理扫描
                             </div>
                           </div>
                         )}
                       </td>
                       <td className="px-2 py-5 text-right">
                         <div className="flex items-center justify-end gap-4 text-[12px] font-bold tracking-widest">
                           <button
                             onClick={() => handleToggle(t.id, !t.enabled)}
                             className="text-slate-400 hover:text-slate-900 transition-colors"
                           >
                             {t.enabled ? '执行熔断阻滞' : '重新提权放行'}
                           </button>
                           <button
                             onClick={() => handleDelete(t.id)}
                             className="text-rose-400 hover:text-rose-600 transition-colors"
                           >
                             指令抹除
                           </button>
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}
