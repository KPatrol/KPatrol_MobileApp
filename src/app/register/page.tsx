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
  User,
  Check,
  X,
  Sparkles,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

const onboardSteps = [
  { step: 1, title: 'Đăng ký tài khoản', desc: 'Điền thông tin cơ bản' },
  { step: 2, title: 'Thêm robot đầu tiên', desc: 'Nhập mã serial của thiết bị' },
  { step: 3, title: 'Sẵn sàng vận hành', desc: 'Điều khiển & xem camera ngay' },
];

const benefits = [
  { icon: Sparkles, label: 'Dùng thử miễn phí' },
  { icon: Zap, label: 'Triển khai dưới 5 phút' },
  { icon: Users, label: 'Hỗ trợ đa người dùng' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const passwordRules = [
    { label: 'Ít nhất 8 ký tự', valid: password.length >= 8 },
    { label: 'Có chữ hoa', valid: /[A-Z]/.test(password) },
    { label: 'Có chữ thường', valid: /[a-z]/.test(password) },
    { label: 'Có số', valid: /[0-9]/.test(password) },
    { label: 'Có ký tự đặc biệt', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const validCount = passwordRules.filter((r) => r.valid).length;
  const isPasswordValid = validCount === passwordRules.length;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const strengthColor =
    validCount <= 2 ? 'bg-red-500' : validCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500';
  const strengthLabel =
    validCount === 0 ? '' : validCount <= 2 ? 'Yếu' : validCount <= 4 ? 'Trung bình' : 'Mạnh';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!isPasswordValid) {
      setError('Mật khẩu chưa đáp ứng yêu cầu bảo mật');
      return;
    }
    if (!doPasswordsMatch) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    const result = await register({ name, email, password });
    if (result.success) {
      router.push('/robots');
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* ── Left Panel — Onboarding ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-accent-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-kpatrol-500/20 rounded-full blur-[120px]" />
        </div>
        <div className="absolute inset-0 grid-bg opacity-30" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
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

          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-6">
              <Sparkles className="w-3 h-3" />
              Dùng thử miễn phí · Không cần thẻ tín dụng
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Vận hành robot trong{' '}
              <span className="text-gradient-blue">3 bước đơn giản</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Chỉ cần một tài khoản, bạn đã có đầy đủ công cụ để giám sát, điều khiển
              và phân tích đội robot tuần tra của mình.
            </p>
          </div>

          <div className="space-y-5">
            {onboardSteps.map((item) => (
              <div key={item.step} className="flex items-start gap-4 group">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-kpatrol-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-lg shadow-kpatrol-500/30 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                </div>
                <div className="pt-1">
                  <p className="text-white font-semibold">{item.title}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
              {benefits.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs"
                >
                  <Icon className="w-3.5 h-3.5 text-kpatrol-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Register Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto relative">
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-kpatrol-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md py-8 relative">
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
            <h2 className="text-3xl font-bold text-white tracking-tight">Tạo tài khoản</h2>
            <p className="text-slate-400 mt-2 text-sm">
              Bắt đầu trải nghiệm hệ sinh thái K-Patrol chỉ trong vài phút.
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
              <label className="text-sm font-medium text-slate-300">Họ và tên</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-kpatrol-400 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  className="w-full pl-12 pr-4 py-3 bg-dark-surface/70 border border-dark-border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-kpatrol-500 focus:ring-2 focus:ring-kpatrol-500/20 focus:bg-dark-surface transition-all"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
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

              {password.length > 0 && (
                <div className="mt-3 space-y-2 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all', strengthColor)}
                        style={{ width: `${(validCount / passwordRules.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-400 min-w-[70px] text-right">
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 bg-dark-surface/40 border border-dark-border rounded-lg">
                    {passwordRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {rule.valid ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span className={rule.valid ? 'text-emerald-400' : 'text-slate-500'}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Xác nhận mật khẩu</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-kpatrol-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn(
                    'w-full pl-12 pr-12 py-3 bg-dark-surface/70 border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:bg-dark-surface transition-all',
                    confirmPassword.length > 0
                      ? doPasswordsMatch
                        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-dark-border focus:border-kpatrol-500 focus:ring-kpatrol-500/20',
                  )}
                />
                {confirmPassword.length > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {doPasswordsMatch ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <X className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-dark-border bg-dark-surface text-kpatrol-500 focus:ring-kpatrol-500/20 focus:ring-offset-dark-bg"
              />
              <span className="text-sm text-slate-400 leading-relaxed">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-kpatrol-400 hover:text-kpatrol-300 font-medium">
                  Điều khoản sử dụng
                </Link>{' '}
                và{' '}
                <Link href="/privacy" className="text-kpatrol-400 hover:text-kpatrol-300 font-medium">
                  Chính sách bảo mật
                </Link>
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch || !agreeTerms}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>
                  Tạo tài khoản
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="text-kpatrol-400 hover:text-kpatrol-300 font-semibold transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
