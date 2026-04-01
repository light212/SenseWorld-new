'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push('/admin/config');
      } else {
        setError(data.error ?? '用户名或密码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-700/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/20 rounded-full blur-3xl" />
      </div>

      {/* Grid lines subtle */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Login card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Sparkles size={22} strokeWidth={2} className="text-slate-900" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">SenseWorld</h1>
            <p className="text-[11px] font-bold tracking-widest text-slate-500 mt-1 uppercase">核心管理中枢</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                账号
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="输入管理员账号"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="输入登录密码"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword
                    ? <EyeOff size={16} strokeWidth={2} />
                    : <Eye size={16} strokeWidth={2} />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full mt-2 bg-white text-slate-900 font-bold text-sm rounded-xl px-4 py-3 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> 验证中...</>
                : '登录后台'
              }
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-600 mt-6">
            SenseWorld AI 多模态平台 · 仅限授权管理员访问
          </p>
        </div>
      </div>
    </div>
  );
}
