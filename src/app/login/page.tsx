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
  ShieldCheck,
  Radio,
  Camera,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: Radio,    label: 'Điều khiển thời gian thực', desc: 'MQTT WebSocket · độ trễ < 50 ms' },
  { icon: Camera,   label: 'Camera HD trực tiếp',       desc: 'MJPEG stream đa nền tảng' },
  { icon: ShieldCheck, label: 'An toàn nhiều tầng',     desc: 'Phát hiện vật cản · giám sát pin' },
  { icon: Activity, label: 'Tuần tra tự động',          desc: 'Bám vạch · điểm kiểm tra QR' },
];

const stats = [
  { value: '6+',    label: 'Module tích hợp' },
  { value: '<50ms', label: 'Độ trễ điều khiển' },
  { value: '24/7',  label: 'Vận hành liên tục' },
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
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
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
    <div className="min-h-screen bg-[#070b14] text-white flex relative overflow-hidden">
      {/* Global ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[680px] h-[680px] bg-kpatrol-500/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-[140px]" />
      </div>

      {/* ── Left Panel — Brand Showcase ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden border-r border-white/5">
        {/* Layered gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950" />

        {/* Soft mesh glows */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-[520px] h-[520px] bg-kpatrol-500/20 rounded-full blur-[130px]" />
          <div className="absolute bottom-10 right-0 w-[440px] h-[440px] bg-accent-500/12 rounded-full blur-[120px]" />
        </div>

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Top-left badge */}
        <div className="absolute top-10 left-12 z-20 flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Kết nối được mã hóa</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
            TLS 1.3
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-14 xl:p-16 w-full">
          {/* Logo */}
          <div className="inline-flex self-start">
            <div className="relative bg-white rounded-2xl px-7 py-5 shadow-2xl shadow-kpatrol-500/30 ring-1 ring-white/10">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-kpatrol-400/40 via-transparent to-accent-400/40 opacity-60 blur-sm -z-10" />
              <Image
                src="/logo_with_branchname.png"
                alt="K-Patrol"
                width={240}
                height={96}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Headline + Robot Hero */}
          <div className="grid grid-cols-[1fr_auto] gap-6 items-center max-w-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kpatrol-500/10 border border-kpatrol-500/30 text-kpatrol-200 text-xs font-medium mb-7">
                <Sparkles className="w-3.5 h-3.5 text-kpatrol-300" />
                Hệ sinh thái robot tuần tra thế hệ mới
              </div>
              <h1 className="text-[2.6rem] xl:text-[3.1rem] font-bold leading-[1.1] mb-5 tracking-tight">
                Giám sát &amp; điều khiển{' '}
                <span className="bg-gradient-to-r from-kpatrol-300 via-cyan-300 to-accent-300 bg-clip-text text-transparent">
                  mọi lúc, mọi nơi
                </span>
              </h1>
              <p className="text-slate-400 text-[1.05rem] leading-relaxed max-w-lg">
                Đăng nhập để kết nối với đội robot tuần tra K-Patrol của bạn —
                một nền tảng thống nhất từ cảm biến biên đến cloud.
              </p>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-4 mt-8 max-w-md">
                {stats.map((s) => (
                  <div key={s.label} className="border-l-2 border-kpatrol-500/40 pl-3">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Robot hero — only shows on xl+ to keep mid-size layouts breathable */}
            <div className="hidden xl:block relative w-[260px] h-[300px]">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-kpatrol-500/15 via-transparent to-accent-500/15 blur-2xl" />
              <div className="absolute inset-4 rounded-full bg-kpatrol-500/10 blur-3xl animate-pulse" />
              <Image
                src="/robots/robot_main.png"
                alt="K-Patrol Robot"
                fill
                sizes="260px"
                className="object-contain drop-shadow-[0_12px_30px_rgba(34,211,238,0.4)]"
                priority
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/70 ring-1 ring-kpatrol-400/40 backdrop-blur-md text-[10px] uppercase tracking-[0.18em] text-kpatrol-200 font-semibold whitespace-nowrap">
                K-Patrol V10
              </div>
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group relative p-4 rounded-xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.06] hover:border-kpatrol-500/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-kpatrol-500/20 to-kpatrol-500/5 border border-kpatrol-500/25 flex items-center justify-center group-hover:from-kpatrol-500/30 group-hover:to-kpatrol-500/10 transition-all">
                    <Icon className="w-4 h-4 text-kpatrol-300" />
                  </div>
                  <span className="text-white font-semibold text-sm">{label}</span>
                </div>
                <p className="text-slate-500 text-xs pl-12 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login Form ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-xl shadow-kpatrol-500/20 ring-1 ring-white/10">
              <Image
                src="/logo_with_branchname.png"
                alt="K-Patrol"
                width={170}
                height={68}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Subtle card glow on lg */}
            <div className="hidden lg:block absolute -inset-2 rounded-3xl bg-gradient-to-br from-kpatrol-500/10 via-transparent to-accent-500/10 blur-2xl opacity-60 -z-10" />

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl xl:text-[2rem] font-bold tracking-tight">Đăng nhập</h2>
              <p className="text-slate-400 mt-2 text-sm">
                Chào mừng trở lại. Nhập thông tin để truy cập đội robot của bạn.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-slide-up">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-300 ml-0.5">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500 group-focus-within:text-kpatrol-300 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@kpatrol.io"
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-kpatrol-500/60 focus:ring-2 focus:ring-kpatrol-500/15 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-300 ml-0.5">Mật khẩu</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500 group-focus-within:text-kpatrol-300 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-12 pr-12 py-3.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-kpatrol-500/60 focus:ring-2 focus:ring-kpatrol-500/15 focus:bg-white/[0.06] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer w-4 h-4 rounded border border-white/20 bg-white/[0.04] text-kpatrol-500 focus:ring-2 focus:ring-kpatrol-500/30 focus:ring-offset-0 cursor-pointer"
                    />
                  </span>
                  <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-kpatrol-300 hover:text-kpatrol-200 font-medium transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-3 shadow-lg shadow-kpatrol-500/30 hover:shadow-kpatrol-500/50 transition-shadow"
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

            {/* Footer info */}
            <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
              <span>Phiên đăng nhập được bảo vệ bằng JWT &amp; mã hóa TLS</span>
            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              Chưa có tài khoản?{' '}
              <Link
                href="/register"
                className="text-kpatrol-300 hover:text-kpatrol-200 font-semibold transition-colors"
              >
                Đăng ký ngay
              </Link>
            </p>

            <p className="mt-6 text-center text-[11px] text-slate-600">
              © {new Date().getFullYear()} K-Patrol Ecosystem · v12.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
