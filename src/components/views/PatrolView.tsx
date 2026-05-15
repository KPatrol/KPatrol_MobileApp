'use client';

import { useState } from 'react';
import {
  Map,
  Wrench,
  Compass,
  Route,
  Play,
  Square,
  AlertTriangle,
  Activity,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMQTT } from '@/providers/MQTTProvider';
import { PatrolPanel } from '@/components/dashboard/PatrolPanel';
import { PatrolRouteView } from './PatrolRouteView';
import type { NavMode } from '@/lib/mqtt-config';

type Tab = 'coverage' | 'line' | 'route' | 'ops';

interface TabSpec {
  key: Tab;
  label: string;
  icon: React.ElementType;
  accent: string;
  glow: string;
  ring: string;
}

const TABS: TabSpec[] = [
  { key: 'coverage', label: 'Phủ vùng',    icon: Compass, accent: 'from-cyan-500 to-cyan-600',     glow: 'shadow-[0_0_18px_rgba(34,211,238,0.5)]',   ring: 'ring-cyan-300/40' },
  { key: 'line',     label: 'Bám line',    icon: Route,   accent: 'from-violet-500 to-violet-600', glow: 'shadow-[0_0_18px_rgba(168,85,247,0.5)]',   ring: 'ring-violet-300/40' },
  { key: 'route',    label: 'Lộ trình GPS', icon: Map,    accent: 'from-emerald-500 to-emerald-600', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.5)]', ring: 'ring-emerald-300/40' },
  { key: 'ops',      label: 'Nâng cao',    icon: Wrench,  accent: 'from-slate-500 to-slate-600',   glow: 'shadow-[0_0_18px_rgba(148,163,184,0.4)]',  ring: 'ring-slate-300/30' },
];

export function PatrolView() {
  const [tab, setTab] = useState<Tab>('coverage');

  return (
    <div className="md:h-full flex flex-col gap-3 md:gap-4 md:min-h-0">
      {/* Tab bar — wraps on narrow screens so all 4 modes stay visible on mobile */}
      <div className="relative p-1 rounded-2xl bg-slate-900/80 backdrop-blur-sm ring-1 ring-cyan-500/30 shadow-[0_0_18px_rgba(34,211,238,0.15)] shrink-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {TABS.map(({ key, label, icon: Icon, accent, glow, ring }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'relative flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all min-h-[44px]',
                tab === key
                  ? `bg-gradient-to-br ${accent} text-white ${glow} ring-1 ${ring}`
                  : 'text-slate-400 hover:text-cyan-200',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:flex-1 md:min-h-0">
        {tab === 'coverage' && <CoveragePanel />}
        {tab === 'line'     && <LineFollowPanel />}
        {tab === 'route'    && <PatrolRouteView />}
        {tab === 'ops'      && <PatrolPanel />}
      </div>
    </div>
  );
}

// ── Coverage (Phủ vùng) ──────────────────────────────────────────────────────

function CoveragePanel() {
  const { navStatus, isRobotOnline, isConnected, sendNavCommand, emergencyStop } = useMQTT();
  const currentMode: NavMode = (navStatus?.mode as NavMode) ?? 'MANUAL';
  const isActive = currentMode === 'AUTO_FREE_COVERAGE';
  const state = navStatus?.state ?? 'idle';
  const canDispatch = isConnected && isRobotOnline;

  return (
    <ModeShell
      title="Phủ vùng (Bao phủ)"
      subtitle="Robot tự khám phá không gian theo random-walk + frontier"
      accent="cyan"
      icon={Compass}
      canDispatch={canDispatch}
      active={isActive}
      state={state}
    >
      <ModeDescription
        bullets={[
          'Dùng cho indoor: robot tự né vật cản qua siêu âm, ToF',
          'Chọn ngẫu nhiên hướng đi mới khi gặp giới hạn',
          'Không cần waypoint hay vạch line trước',
        ]}
      />
      <ModeActions
        startLabel="Bắt đầu phủ vùng"
        active={isActive}
        canDispatch={canDispatch}
        onStart={() => sendNavCommand('auto_free_coverage_start')}
        onStop={() => sendNavCommand('manual')}
        onEmergency={() => emergencyStop()}
        accentBtn="from-cyan-500 to-cyan-600"
      />
    </ModeShell>
  );
}

// ── Line Follow (Bám line) ────────────────────────────────────────────────────

function LineFollowPanel() {
  const { navStatus, isRobotOnline, isConnected, sendNavCommand, emergencyStop } = useMQTT();
  const currentMode: NavMode = (navStatus?.mode as NavMode) ?? 'MANUAL';
  const isActive = currentMode === 'AUTO_LINE_FOLLOW';
  const state = navStatus?.state ?? 'idle';
  const canDispatch = isConnected && isRobotOnline;

  return (
    <ModeShell
      title="Bám line"
      subtitle="Camera nhận diện vạch sàn, PD controller giữ hướng"
      accent="violet"
      icon={Route}
      canDispatch={canDispatch}
      active={isActive}
      state={state}
    >
      <ModeDescription
        bullets={[
          'Camera Pi quét HSV mask để tìm vạch (mặc định trắng/đỏ)',
          'PD controller: kp_heading = 8, kd_heading = 0, deadband ±0.02 rad',
          'Tự dừng khi mất line > 2 s liên tục',
        ]}
      />
      <ModeActions
        startLabel="Bắt đầu bám line"
        active={isActive}
        canDispatch={canDispatch}
        onStart={() => sendNavCommand('auto_line_follow_start')}
        onStop={() => sendNavCommand('manual')}
        onEmergency={() => emergencyStop()}
        accentBtn="from-violet-500 to-violet-600"
      />
      <div className="bg-slate-900/40 border border-violet-500/20 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2">
        <Camera className="w-4 h-4 text-violet-300 flex-shrink-0 mt-0.5" />
        <span>
          Cần đảm bảo camera hướng xuống vạch và đèn LED sàn sáng đủ trước khi
          chạy. Mở tab <strong>Camera</strong> để xem trực tiếp luồng MJPEG.
        </span>
      </div>
    </ModeShell>
  );
}

// ── Shared shell ─────────────────────────────────────────────────────────────

interface ModeShellProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: 'cyan' | 'violet' | 'emerald';
  canDispatch: boolean;
  active: boolean;
  state: string;
  children: React.ReactNode;
}

const ACCENT_MAP: Record<ModeShellProps['accent'], { ring: string; text: string; bg: string; glow: string }> = {
  cyan:    { ring: 'ring-cyan-500/40',    text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    glow: 'shadow-[0_0_18px_rgba(34,211,238,0.25)]' },
  violet:  { ring: 'ring-violet-500/40',  text: 'text-violet-300',  bg: 'bg-violet-500/10',  glow: 'shadow-[0_0_18px_rgba(168,85,247,0.25)]' },
  emerald: { ring: 'ring-emerald-500/40', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.25)]' },
};

function ModeShell({ title, subtitle, icon: Icon, accent, canDispatch, active, state, children }: ModeShellProps) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        accent === 'cyan'   && 'border-cyan-500/30',
        accent === 'violet' && 'border-violet-500/30',
      )}>
        <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
          accent === 'cyan'   && 'via-cyan-400/50',
          accent === 'violet' && 'via-violet-400/50',
        )} />
        <div className="relative p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn('p-2.5 rounded-2xl ring-1', a.bg, a.ring, a.glow)}>
              <Icon className={cn('w-5 h-5', a.text)} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-base md:text-lg truncate">{title}</h2>
              <p className="text-xs text-slate-400 line-clamp-2">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
              active ? `${a.text} ${a.bg} ${a.ring}` : 'text-slate-400 bg-slate-500/10 ring-slate-500/40',
            )}>
              <Activity className="w-3 h-3" />
              {active ? 'Đang chạy' : 'Chờ'}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
              canDispatch ? 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/40' : 'text-red-300 bg-red-500/10 ring-red-500/40',
            )}>
              {canDispatch ? 'Robot online' : 'Robot offline'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-slate-300 bg-slate-700/40 ring-1 ring-slate-600/40">
              state: {state}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function ModeDescription({ bullets }: { bullets: string[] }) {
  return (
    <ul className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 md:p-4 space-y-1.5 text-xs md:text-sm text-slate-300">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-kpatrol-400 mt-0.5">•</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

interface ModeActionsProps {
  startLabel: string;
  active: boolean;
  canDispatch: boolean;
  onStart: () => void;
  onStop: () => void;
  onEmergency: () => void;
  accentBtn: string;
}

function ModeActions({ startLabel, active, canDispatch, onStart, onStop, onEmergency, accentBtn }: ModeActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button
        onClick={onStart}
        disabled={!canDispatch || active}
        className={cn(
          'flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all min-h-[48px]',
          'bg-gradient-to-br', accentBtn,
          'disabled:opacity-40 disabled:cursor-not-allowed',
          !active && canDispatch && 'hover:brightness-110',
        )}
      >
        <Play className="w-4 h-4" />
        {startLabel}
      </button>
      <button
        onClick={onStop}
        disabled={!canDispatch || !active}
        className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-slate-200 text-sm bg-slate-700/60 hover:bg-slate-700 transition-all min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Square className="w-4 h-4" />
        Dừng (về MANUAL)
      </button>
      <button
        onClick={onEmergency}
        disabled={!canDispatch}
        className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-br from-red-600 to-red-700 hover:brightness-110 transition-all min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <AlertTriangle className="w-4 h-4" />
        Khẩn cấp
      </button>
    </div>
  );
}
