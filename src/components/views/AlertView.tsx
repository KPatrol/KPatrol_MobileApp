'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Flame,
  UserRound,
  Activity,
  Trash2,
  Filter,
  ImageIcon,
  Clock,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { useMQTT } from '@/providers/MQTTProvider';
import { useRobotContext } from '@/providers/RobotProvider';
import { DetectionAlert, DetectionKind } from '@/lib/mqtt-config';
import { cn } from '@/lib/utils';

type FilterKind = 'all' | DetectionKind;

const kindMeta: Record<DetectionKind, {
  label: string;
  icon: typeof UserRound;
  ring: string;
  text: string;
  bg: string;
  glow: string;
  dot: string;
}> = {
  person: {
    label: 'Người',
    icon: UserRound,
    ring: 'ring-purple-500/30',
    text: 'text-purple-300',
    bg: 'bg-purple-500/10',
    glow: 'shadow-[0_0_18px_rgba(168,85,247,0.18)]',
    dot: 'bg-purple-400',
  },
  fire: {
    label: 'Cháy',
    icon: Flame,
    ring: 'ring-orange-500/40',
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    glow: 'shadow-[0_0_22px_rgba(249,115,22,0.25)]',
    dot: 'bg-orange-400',
  },
  motion: {
    label: 'Chuyển động',
    icon: Activity,
    ring: 'ring-yellow-500/30',
    text: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    glow: 'shadow-[0_0_18px_rgba(250,204,21,0.18)]',
    dot: 'bg-yellow-400',
  },
};

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelative(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 5) return 'vừa xong';
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export function AlertView() {
  const { detectionAlerts, clearDetectionAlerts, isConnected } = useMQTT();
  const { selectedRobot } = useRobotContext();
  const [filter, setFilter] = useState<FilterKind>('all');
  const [selected, setSelected] = useState<DetectionAlert | null>(null);

  const stats = useMemo(() => {
    const totals: Record<DetectionKind, number> = { person: 0, fire: 0, motion: 0 };
    const now = Date.now() / 1000;
    let last24h = 0;
    for (const a of detectionAlerts) {
      if (a.kind in totals) totals[a.kind]++;
      if (now - a.ts < 86400) last24h++;
    }
    return { totals, last24h, total: detectionAlerts.length };
  }, [detectionAlerts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return detectionAlerts;
    return detectionAlerts.filter(a => a.kind === filter);
  }, [detectionAlerts, filter]);

  return (
    <div className="md:h-full flex flex-col gap-3 md:gap-4 md:min-h-0">
      {/* HUD Header */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-red-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
        <div className="flex items-center justify-between gap-3 flex-wrap p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/30 to-orange-500/15 ring-1 ring-red-500/40 flex items-center justify-center shadow-[0_0_18px_rgba(239,68,68,0.3)]">
              <ShieldAlert className="w-6 h-6 text-red-300" />
            </div>
            <div>
              <h2 className="text-white font-black text-base uppercase tracking-widest">Cảnh báo AI</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 uppercase tracking-wider font-bold">
                <span className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.7)]' : 'bg-red-500')} />
                {isConnected ? 'Đang theo dõi' : 'Mất kết nối MQTT'}
                {selectedRobot && <span className="font-mono text-[10px] text-cyan-300 normal-case">· {selectedRobot.serialNumber}</span>}
              </p>
            </div>
          </div>

          {detectionAlerts.length > 0 && (
            <button
              onClick={clearDetectionAlerts}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-slate-400 hover:text-red-300 ring-1 ring-slate-700/60 hover:ring-red-500/40 rounded-lg px-3 py-2 transition-colors bg-slate-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xoá tất cả
            </button>
          )}
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 shrink-0">
        <StatCard label="Tổng cảnh báo" value={stats.total} icon={AlertTriangle} tone="cyan" />
        <StatCard label="Người" value={stats.totals.person} icon={UserRound} tone="purple" />
        <StatCard label="Cháy" value={stats.totals.fire} icon={Flame} tone="orange" />
        <StatCard label="24 giờ qua" value={stats.last24h} icon={Clock} tone="emerald" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <Filter className="w-4 h-4 text-slate-500" />
        {(['all', 'person', 'fire', 'motion'] as FilterKind[]).map(k => {
          const isActive = filter === k;
          const label = k === 'all' ? 'Tất cả' : kindMeta[k].label;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg ring-1 transition-all',
                isActive
                  ? 'bg-cyan-500/15 ring-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                  : 'ring-slate-700/60 text-slate-400 bg-slate-900/40 hover:text-slate-200 hover:ring-slate-600'
              )}
            >
              {label}
              {k !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70 tabular-nums">{stats.totals[k]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed (inner scroll) */}
      <div className="min-h-[400px] md:flex-1 md:min-h-0 md:overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 ? (
          <EmptyAlertState />
        ) : (
          <div className="space-y-2 pb-2">
            {filtered.map((alert, i) => {
              const meta = kindMeta[alert.kind];
              const Icon = meta.icon;
              const pct = Math.round((alert.confidence ?? 0) * 100);
              const [bx, by, bw, bh] = alert.bbox ?? [0, 0, 0, 0];
              return (
                <button
                  key={`${alert.ts}-${i}`}
                  onClick={() => setSelected(alert)}
                  className={cn(
                    'group w-full text-left rounded-2xl ring-1 p-3 md:p-4 flex items-start gap-3 transition-all',
                    'bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-950/80 backdrop-blur-sm hover:bg-slate-900/80',
                    meta.ring,
                    meta.glow
                  )}
                >
                  {/* Thumbnail (inline JPEG when Pi attached one, icon chip otherwise) */}
                  {alert.snapshot_b64 ? (
                    <div className={cn('relative w-16 h-16 rounded-xl overflow-hidden shrink-0 ring-1', meta.ring, meta.glow)}>
                      <img
                        src={`data:image/jpeg;base64,${alert.snapshot_b64}`}
                        alt={`${meta.label} snapshot`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className={cn('absolute bottom-0 left-0 right-0 px-1 py-0.5 flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider', meta.bg, meta.text)}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </div>
                    </div>
                  ) : (
                    <DetectionGlyph kind={alert.kind} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-sm uppercase tracking-wider">{meta.label}</span>
                      <span className={cn('text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1', meta.text, meta.ring, meta.bg)}>
                        ĐCX {pct}%
                      </span>
                      {alert.kind === 'fire' && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 ring-1 ring-red-500/40 animate-pulse">
                          Khẩn cấp
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums truncate">
                      khung=[{bx},{by},{bw},{bh}] · {alert.snapshot ?? 'chưa có ảnh'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-300 uppercase tracking-wider font-bold">{formatRelative(alert.ts)}</p>
                    <p className="text-[10px] text-slate-500 font-mono tabular-nums">{formatTime(alert.ts)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <AlertDetailModal alert={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

const TONE_TILE: Record<'cyan' | 'purple' | 'orange' | 'emerald', { ring: string; text: string; bg: string; glow: string }> = {
  cyan:    { ring: 'border-cyan-500/30',    text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    glow: 'shadow-[0_0_18px_rgba(34,211,238,0.18)]' },
  purple:  { ring: 'border-purple-500/30',  text: 'text-purple-300',  bg: 'bg-purple-500/10',  glow: 'shadow-[0_0_18px_rgba(168,85,247,0.18)]' },
  orange:  { ring: 'border-orange-500/30',  text: 'text-orange-300',  bg: 'bg-orange-500/10',  glow: 'shadow-[0_0_18px_rgba(249,115,22,0.18)]' },
  emerald: { ring: 'border-emerald-500/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.18)]' },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof UserRound;
  tone: 'cyan' | 'purple' | 'orange' | 'emerald';
}) {
  const t = TONE_TILE[tone];
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border backdrop-blur-sm p-3',
      t.ring,
      t.glow
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-xl ring-1 flex items-center justify-center', t.bg, t.ring.replace('border-', 'ring-'))}>
          <Icon className={cn('w-4 h-4', t.text)} />
        </div>
        <span className={cn('text-2xl md:text-3xl font-black tabular-nums', t.text)}>{value}</span>
      </div>
      <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-2">{label}</p>
    </div>
  );
}

function AlertDetailModal({ alert, onClose }: { alert: DetectionAlert; onClose: () => void }) {
  const meta = kindMeta[alert.kind];
  const Icon = meta.icon;
  const pct = Math.round((alert.confidence ?? 0) * 100);
  const [bx, by, bw, bh] = alert.bbox ?? [0, 0, 0, 0];
  const [fw, fh] = alert.frame_size ?? [640, 480];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 ring-1 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]',
          meta.ring
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className={cn('flex items-center gap-3 p-4 border-b border-slate-700/40', meta.bg)}>
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center ring-1 bg-slate-950/60', meta.ring, meta.text)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black uppercase tracking-widest text-sm">{meta.label}</h3>
            <p className="text-slate-400 text-[11px] font-mono tabular-nums">{new Date(alert.ts * 1000).toLocaleString('vi-VN')}</p>
          </div>
          <span className={cn('text-xs font-black uppercase tabular-nums px-2 py-1 rounded-md ring-1', meta.text, meta.ring, meta.bg)}>
            {pct}%
          </span>
        </div>

        {alert.snapshot_b64 ? (
          <div className="relative aspect-video bg-slate-950/90 border-b border-slate-700/40 flex items-center justify-center overflow-hidden">
            <img
              src={`data:image/jpeg;base64,${alert.snapshot_b64}`}
              alt={`${meta.label} snapshot`}
              className="w-full h-full object-contain"
            />
            <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-slate-950/80 text-slate-300 ring-1 ring-slate-700/60 font-mono">
              {alert.snapshot ?? 'Ảnh nhúng JPEG'}
            </span>
          </div>
        ) : (
          <div className="aspect-video bg-slate-950/70 border-b border-slate-700/40 flex flex-col items-center justify-center text-slate-500">
            <ImageIcon className="w-10 h-10 mb-2 opacity-60" />
            <p className="text-xs font-mono">{alert.snapshot ?? 'snapshot chưa có'}</p>
            <p className="text-[10px] mt-1 uppercase tracking-wider">(Ảnh lưu trên Pi — cần tải qua API)</p>
          </div>
        )}

        <div className="p-4 space-y-2">
          <Row label="Mã robot" value={alert.robot} mono />
          <Row label="Thời gian" value={new Date(alert.ts * 1000).toLocaleString('vi-VN')} mono />
          <Row label="Khung hình" value={`${fw} × ${fh}px`} />
          <Row label="Khung phát hiện" value={`x=${bx}, y=${by}, w=${bw}, h=${bh}`} mono />
          <Row label="Độ chính xác" value={`${pct}%`} />
        </div>

        <div className="p-4 border-t border-slate-700/40">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/40 hover:bg-cyan-500/25 text-cyan-200 font-black text-xs uppercase tracking-widest transition-colors shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">{label}</span>
      <span className={cn('text-slate-200 text-xs truncate', mono && 'font-mono tabular-nums')}>{value}</span>
    </div>
  );
}

// Icon-chip thumbnail rendered when Pi did not attach a snapshot_b64 to the
// alert. Inline SVG so the UI remains usable fully offline — no remote assets.
function DetectionGlyph({ kind }: { kind: DetectionKind }) {
  const meta = kindMeta[kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'relative w-16 h-16 rounded-xl overflow-hidden shrink-0 ring-1',
        meta.bg,
        meta.ring,
        meta.glow,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className={cn('absolute inset-0 w-full h-full opacity-60', meta.text)}
        aria-hidden
      >
        <defs>
          <radialGradient id={`glow-${kind}`} cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id={`grid-${kind}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="64" height="64" fill={`url(#grid-${kind})`} />
        <circle cx="32" cy="34" r="26" fill={`url(#glow-${kind})`} />
        {kind === 'person' && (
          <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5">
            <circle cx="32" cy="34" r="10" />
            <circle cx="32" cy="34" r="18" strokeDasharray="2 3" />
            <circle cx="32" cy="34" r="26" strokeDasharray="1 4" />
          </g>
        )}
        {kind === 'fire' && (
          <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.55">
            <path d="M 12 50 Q 32 30 52 50" />
            <path d="M 16 54 Q 32 38 48 54" strokeDasharray="2 2" />
            <path d="M 20 58 Q 32 46 44 58" strokeDasharray="1 3" />
          </g>
        )}
        {kind === 'motion' && (
          <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5">
            <path d="M 8 22 L 22 22 M 8 32 L 32 32 M 8 42 L 22 42" strokeDasharray="2 2" />
            <path d="M 42 22 L 56 22 M 42 32 L 56 32 M 42 42 L 56 42" strokeDasharray="2 2" />
          </g>
        )}
      </svg>
      <Icon className={cn('absolute inset-0 m-auto w-6 h-6 drop-shadow-[0_0_8px_currentColor]', meta.text)} />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-1 py-0.5 flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider backdrop-blur-[2px]',
          meta.bg,
          meta.text,
        )}
      >
        {meta.label}
      </div>
    </div>
  );
}

// Idle/empty state. Animated radar sweep over a person + flame silhouette to
// signal "AI is actively watching, nothing flagged yet" — pure SVG so the
// empty state works offline and degrades gracefully if motion is disabled.
function EmptyAlertState() {
  return (
    <div className="h-full rounded-3xl ring-1 ring-dashed ring-slate-700/50 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="empty-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="empty-sweep" x1="100" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
            <pattern id="empty-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#22d3ee" strokeOpacity="0.08" strokeWidth="0.6" />
            </pattern>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#empty-glow)" />
          <rect x="8" y="8" width="184" height="184" rx="14" fill="url(#empty-grid)" />
          <g stroke="#22d3ee" strokeOpacity="0.35" fill="none">
            <circle cx="100" cy="100" r="86" />
            <circle cx="100" cy="100" r="62" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="38" strokeDasharray="2 4" />
            <line x1="14" y1="100" x2="186" y2="100" strokeDasharray="2 6" />
            <line x1="100" y1="14" x2="100" y2="186" strokeDasharray="2 6" />
          </g>
          {/* Animated radar sweep — Tailwind animate-spin (1s) slowed via custom duration */}
          <g className="origin-center animate-[spin_6s_linear_infinite]" style={{ transformOrigin: '100px 100px' }}>
            <path d="M 100 100 L 100 14 A 86 86 0 0 1 174 60 Z" fill="url(#empty-sweep)" opacity="0.7" />
          </g>
          {/* Person silhouette */}
          <g transform="translate(70 78)" fill="#a78bfa" opacity="0.85">
            <circle cx="10" cy="6" r="5" />
            <path d="M 2 26 Q 10 14 18 26 L 18 36 Q 10 32 2 36 Z" />
          </g>
          {/* Flame silhouette */}
          <g transform="translate(112 78)" fill="#fb923c" opacity="0.85">
            <path d="M 8 36 Q -2 26 4 16 Q 6 22 8 18 Q 12 8 16 16 Q 20 26 14 32 Q 12 28 10 32 Q 12 34 8 36 Z" />
          </g>
        </svg>
        {/* Center pulse */}
        <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
        <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(74,222,128,0.85)]" />
      </div>
      <div className="text-center">
        <p className="text-white font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          Không có cảnh báo
        </p>
        <p className="text-slate-400 text-[11px] mt-1 uppercase tracking-wider font-bold">
          AI đang quét người &amp; lửa — khu vực tuần tra an toàn.
        </p>
      </div>
      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
