'use client';

import Image from 'next/image';
import {
  Activity,
  Battery,
  Bot,
  ChevronDown,
  Gamepad2,
  HelpCircle,
  History,
  LayoutDashboard,
  Navigation,
  Plus,
  Settings,
  ShieldAlert,
  ThermometerSun,
  Video,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Progress } from '@/components/ui/Progress';
import { useMQTT } from '@/providers/MQTTProvider';
import {
  QUICK_ACTION_BY_ID,
  QUICK_ACTION_TONES,
} from '@/lib/quick-actions';
import { cn, formatDuration, sanitizeUptime } from '@/lib/utils';
import { useRobotStore } from '@/store/robotStore';

type ViewType = 'dashboard' | 'control' | 'camera' | 'patrol' | 'alerts' | 'history' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = {
  id: ViewType;
  label: string;
  icon: typeof LayoutDashboard;
  badge: string | null;
  badgeTone?: 'live' | 'danger' | 'default';
};

export function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  const store = useRobotStore();
  const mqtt = useMQTT();
  const [showRobotDetails, setShowRobotDetails] = useState(false);

  const isConnected = mqtt.isRobotOnline || store.isConnected;
  const batteryLevel = mqtt.robotStatus?.battery ?? store.batteryLevel;
  const temperature = mqtt.robotStatus?.temperature ?? store.temperature;
  const uptime = sanitizeUptime(mqtt.robotStatus?.uptime);
  const latency = mqtt.lastHeartbeat ? Date.now() - mqtt.lastHeartbeat : null;
  const signalQuality = latency != null ? (latency < 200 ? 100 : latency < 500 ? 70 : latency < 1000 ? 40 : 10) : 0;
  const signalLabel = latency != null ? (latency < 200 ? 'Tuyệt vời' : latency < 500 ? 'Tốt' : latency < 1000 ? 'Trung bình' : 'Yếu') : 'Không có';
  const navMode = mqtt.navStatus?.mode ?? 'MANUAL';

  const alertCount = mqtt.detectionAlerts?.length ?? 0;
  const hasFireAlert = mqtt.detectionAlerts?.some((a) => a.kind === 'fire') ?? false;
  const alertBadge = alertCount > 0
    ? { text: alertCount > 99 ? '99+' : String(alertCount), tone: hasFireAlert ? 'danger' as const : 'default' as const }
    : null;

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'control', label: 'Điều khiển', icon: Gamepad2, badge: null },
    { id: 'camera', label: 'Camera', icon: Video, badge: 'LIVE', badgeTone: 'live' },
    { id: 'patrol', label: 'Bản đồ & Tuần tra', icon: Navigation, badge: null },
    { id: 'alerts', label: 'Cảnh báo AI', icon: ShieldAlert, badge: alertBadge?.text ?? null, badgeTone: alertBadge?.tone },
    { id: 'history', label: 'Lịch sử', icon: History, badge: null },
    { id: 'settings', label: 'Cài đặt', icon: Settings, badge: null },
  ];

  const enabledQuickActions = useMemo(
    () =>
      (store.settings.quickActions ?? [])
        .filter((qa) => qa.enabled)
        .map((qa) => ({ config: qa, def: QUICK_ACTION_BY_ID[qa.id] }))
        .filter((entry) => Boolean(entry.def)),
    [store.settings.quickActions]
  );

  const handleToggleQuickAction = (id: string) => {
    const next = (store.settings.quickActions ?? []).map((qa) =>
      qa.id === id ? { ...qa, active: !qa.active } : qa
    );
    store.updateSettings({ quickActions: next });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50',
          'w-72 flex flex-col overflow-hidden',
          'bg-slate-950/85 backdrop-blur-xl',
          'border-r border-cyan-500/15',
          'shadow-[8px_0_32px_-12px_rgba(34,211,238,0.18)]',
          'transform transition-transform duration-300 ease-in-out',
          'md:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Ambient cockpit glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-12 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 -right-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center justify-between h-16 px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900/80 ring-1 ring-cyan-400/40 flex items-center justify-center shadow-[0_0_18px_rgba(34,211,238,0.35)]">
              <Image
                src="/logo.png"
                alt="K-Patrol Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight bg-gradient-to-br from-cyan-300 via-cyan-100 to-blue-300 bg-clip-text text-transparent">
                K-Patrol
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                Control Center · v1.0
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg ring-1 ring-cyan-500/20 hover:ring-cyan-400/55 hover:bg-cyan-500/10 text-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated divider */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        {/* Navigation */}
        <nav className="relative p-4 space-y-1 flex-1 overflow-y-auto custom-scroll">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400/70 mb-3 px-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            Menu chính
          </p>
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
                  'transition-all duration-200 group relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-white ring-1 ring-cyan-400/45 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                    : 'text-slate-400 ring-1 ring-transparent hover:bg-slate-900/60 hover:ring-cyan-500/20 hover:text-white'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-cyan-300 to-blue-500 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
                )}
                <span
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-lg transition-all',
                    isActive
                      ? 'bg-cyan-500/15 ring-1 ring-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-900/40 ring-1 ring-transparent group-hover:ring-cyan-500/25'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-[18px] h-[18px] transition-colors',
                      isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-200'
                    )}
                  />
                </span>
                <span className="font-bold text-base flex-1 text-left tracking-tight">
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-widest',
                      item.badgeTone === 'live' &&
                        'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40 animate-pulse',
                      item.badgeTone === 'danger' &&
                        'bg-rose-500 text-white ring-1 ring-rose-300/50 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]',
                      (!item.badgeTone || item.badgeTone === 'default') &&
                        'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/40'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Actions — user-configurable */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-3 px-3">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400/70 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                Thao tác nhanh
              </p>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onViewChange('settings');
                  onClose();
                }}
                className="text-[10px] uppercase tracking-widest text-cyan-300/60 hover:text-cyan-200 inline-flex items-center gap-1 transition-colors"
                title="Tuỳ chỉnh trong Cài đặt"
              >
                <Plus className="w-3 h-3" />
                Tuỳ chỉnh
              </Link>
            </div>

            {enabledQuickActions.length === 0 ? (
              <button
                onClick={() => {
                  onViewChange('settings');
                  onClose();
                }}
                className="w-full px-4 py-4 rounded-xl border border-dashed border-cyan-500/25 text-[11px] uppercase tracking-widest text-slate-500 hover:text-cyan-200 hover:border-cyan-400/55 hover:bg-cyan-500/5 transition-all"
              >
                Chưa có thao tác — bấm để thêm
              </button>
            ) : (
              <div className="space-y-1">
                {enabledQuickActions.map(({ config, def }) => {
                  const tone = QUICK_ACTION_TONES[def.tone];
                  return (
                    <button
                      key={config.id}
                      onClick={() => handleToggleQuickAction(config.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 transition-all',
                        config.active
                          ? `${tone.bg} ${tone.ring} ${tone.glow}`
                          : 'bg-slate-900/40 ring-cyan-500/10 hover:ring-cyan-400/35 hover:bg-slate-900/70'
                      )}
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-md ring-1 transition-all',
                          config.active
                            ? `${tone.iconBg} ${tone.ring}`
                            : 'bg-slate-900/60 ring-cyan-500/15'
                        )}
                      >
                        <def.icon
                          className={cn(
                            'w-4 h-4',
                            config.active ? tone.text : 'text-slate-500'
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold flex-1 text-left tracking-tight',
                          config.active ? 'text-white' : 'text-slate-400'
                        )}
                      >
                        {def.label}
                      </span>
                      <span
                        className={cn(
                          'relative w-9 h-5 rounded-full transition-colors ring-1',
                          config.active
                            ? `${tone.bg} ${tone.ring}`
                            : 'bg-slate-800 ring-slate-700/60'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm',
                            config.active ? 'left-[18px]' : 'left-0.5'
                          )}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Animated divider */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

        {/* Robot Status Card */}
        <div className="relative p-4 shrink-0">
          <div
            className={cn(
              'rounded-xl overflow-hidden transition-all ring-1',
              showRobotDetails
                ? 'bg-slate-900/80 ring-cyan-400/35 shadow-[0_0_22px_rgba(34,211,238,0.15)]'
                : 'bg-slate-900/50 ring-cyan-500/15 hover:ring-cyan-400/35 hover:bg-slate-900/70'
            )}
          >
            {/* Header - Always visible */}
            <button
              onClick={() => setShowRobotDetails(!showRobotDetails)}
              className="w-full p-3 flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 ring-1 ring-cyan-400/40 shadow-[0_0_14px_rgba(34,211,238,0.3)] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-cyan-300" />
                </div>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-slate-950',
                    isConnected
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                      : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                  )}
                />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-white text-sm tracking-tight">
                  {navMode !== 'MANUAL' ? navMode : 'KPATROL-001'}
                </p>
                <p
                  className={cn(
                    'text-[10px] uppercase tracking-widest font-bold',
                    isConnected ? 'text-emerald-300' : 'text-rose-300'
                  )}
                >
                  {isConnected ? '● Online' : '○ Offline'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-cyan-300/70 transition-transform',
                  showRobotDetails && 'rotate-180'
                )}
              />
            </button>

            {/* Expandable Details */}
            {showRobotDetails && (
              <div className="px-3 pb-3 space-y-3 animate-slide-up">
                {/* Battery */}
                <div className="flex items-center gap-2">
                  <Battery
                    className={cn(
                      'w-4 h-4',
                      batteryLevel > 50
                        ? 'text-emerald-300'
                        : batteryLevel > 20
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Pin</span>
                      <span className="text-white font-bold">{batteryLevel}%</span>
                    </div>
                    <Progress
                      value={batteryLevel}
                      max={100}
                      size="sm"
                      color={batteryLevel > 50 ? 'success' : batteryLevel > 20 ? 'warning' : 'error'}
                    />
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center gap-2">
                  <ThermometerSun
                    className={cn(
                      'w-4 h-4',
                      temperature < 60
                        ? 'text-emerald-300'
                        : temperature < 75
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Nhiệt độ</span>
                      <span className="text-white font-bold">{temperature}°C</span>
                    </div>
                    <Progress
                      value={temperature}
                      max={100}
                      size="sm"
                      color={temperature < 60 ? 'success' : temperature < 75 ? 'warning' : 'error'}
                    />
                  </div>
                </div>

                {/* Connection Quality */}
                <div className="flex items-center gap-2">
                  <Wifi
                    className={cn(
                      'w-4 h-4',
                      signalQuality > 60
                        ? 'text-emerald-300'
                        : signalQuality > 30
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Tín hiệu</span>
                      <span className="text-white font-bold">{signalLabel}</span>
                    </div>
                    <Progress
                      value={signalQuality}
                      max={100}
                      size="sm"
                      color={signalQuality > 60 ? 'success' : signalQuality > 30 ? 'warning' : 'error'}
                    />
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 rounded-lg bg-slate-950/60 ring-1 ring-cyan-500/15 p-2 text-center">
                    <Activity className="w-3.5 h-3.5 text-cyan-300 mx-auto mb-1" />
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Uptime</p>
                    <p className="text-sm font-black text-white">
                      {uptime > 0 ? formatDuration(uptime) : '—'}
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg bg-slate-950/60 ring-1 ring-cyan-500/15 p-2 text-center">
                    <Zap className="w-3.5 h-3.5 text-amber-300 mx-auto mb-1" />
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Ping</p>
                    <p className="text-sm font-black text-white">{latency != null ? `${latency}ms` : '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Link */}
          <button className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-[10px] uppercase tracking-widest text-slate-500 hover:text-cyan-200 transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cần hỗ trợ?</span>
          </button>
        </div>
      </aside>
    </>
  );
}
