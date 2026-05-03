'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Radio,
  Camera,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: Radio, label: 'Điều khiển thời gian thực', desc: 'Độ trễ MQTT dưới 50ms' },
  { icon: Camera, label: 'Camera trực tiếp', desc: 'Stream HD đa nền tảng' },
  { icon: Shield, label: 'An toàn thông minh', desc: 'Phát hiện vật cản đa tầng' },
  { icon: Activity, label: 'Tuần tra tự động', desc: 'Bám vạch & điểm kiểm tra' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    const result = await login({ email, password, rememberMe });

    if (result.success) {
      router.push('/robots');
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* ── Left Panel — Brand Showcase ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        {/* Ambient mesh glow */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-kpatrol-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/15 rounded-full blur-[120px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 grid-bg opacity-30" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          {/* Logo card — white background so blue + gray both pop */}
          <div className="inline-flex self-start">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-2xl shadow-kpatrol-500/20 ring-1 ring-white/20">
              <Image
                src="/logo_with_branchname.png"
                alt="K-Patrol"
                width={220}
                height={88}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kpatrol-500/10 border border-kpatrol-500/30 text-kpatrol-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-kpatrol-400 animate-pulse" />
              Hệ sinh thái robot tuần tra thế hệ mới
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Giám sát &amp; điều khiển{' '}
              <span className="text-gradient-blue">mọi lúc, mọi nơi</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Đăng nhập để kết nối với đội robot tuần tra K-Patrol của bạn.
              Nền tảng thống nhất — từ cảm biến đến cloud.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm hover:bg-white/[0.06] hover:border-kpatrol-500/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-kpatrol-500/15 border border-kpatrol-500/20 flex items-center justify-center group-hover:bg-kpatrol-500/25 transition-colors">
                    <Icon className="w-4 h-4 text-kpatrol-400" />
                  </div>
                  <span className="text-white font-medium text-sm">{label}</span>
                </div>
                <p className="text-slate-500 text-xs pl-11">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Mobile ambient glow */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-kpatrol-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-xl shadow-kpatrol-500/20">
              <Image
                src="/logo_with_branchname.png"
                alt="K-Patrol"
                width={160}
                height={64}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Đăng nhập</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Chào mừng trở lại. Nhập thông tin tài khoản để tiếp tục.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-kpatrol-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@kpatrol.io"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 bg-dark-surface/70 border border-dark-border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-kpatrol-500 focus:ring-2 focus:ring-kpatrol-500/20 focus:bg-dark-surface transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Mật khẩu</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-kpatrol-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3 bg-dark-surface/70 border border-dark-border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-kpatrol-500 focus:ring-2 focus:ring-kpatrol-500/20 focus:bg-dark-surface transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-border bg-dark-surface text-kpatrol-500 focus:ring-kpatrol-500/20 focus:ring-offset-dark-bg"
                />
                <span className="text-sm text-slate-400">Ghi nhớ đăng nhập</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-kpatrol-400 hover:text-kpatrol-300 font-medium transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-3 bg-dark-bg text-slate-500">hoặc</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-dark-surface/60 border border-dark-border rounded-xl text-slate-200 font-medium hover:bg-dark-surface hover:border-dark-hover transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập với Google
          </button>

          <p className="mt-8 text-center text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="text-kpatrol-400 hover:text-kpatrol-300 font-semibold transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} K-Patrol Ecosystem · v12.0
          </p>
        </div>
      </div>
    </div>
  );
}
