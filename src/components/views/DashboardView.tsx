'use client';

import {
  Battery,
  Gauge,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Activity,
  Satellite,
  RefreshCw,
} from 'lucide-react';
import { useRobotStore, type Alert } from '@/store/robotStore';
import { useMQTT } from '@/providers/MQTTProvider';
import { useAppMode } from '@/providers/AppModeProvider';
import { formatDuration } from '@/lib/utils';
import { Progress } from '@/components/ui/Progress';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { PhenikaaMap } from '@/components/map/PhenikaaMap';
import { cn } from '@/lib/utils';

const fmt = {
  pct: (v?: number) => (v == null ? '—' : `${Math.round(v)}%`),
  speed: (v?: number) => (v == null ? '—' : v.toFixed(2)),
  coord: (v?: number, digits = 4) => (v == null ? '—' : v.toFixed(digits)),
  duration: (v?: number) => (v == null ? '—' : formatDuration(v)),
};

export function DashboardView() {
  const alerts = useRobotStore((s) => s.alerts);
  const { isDev } = useAppMode();

  const {
    isConnected: mqttConnected,
    isRobotOnline,
    isMotorControllerOnline,
    isEncoderReaderOnline,
    robotStatus,
    lastHeartbeat,
    connect,
    motors,
    gpsData,
  } = useMQTT();

  const battery = robotStatus?.battery;
  const speed = robotStatus?.speed;
  const latency = lastHeartbeat ? Date.now() - lastHeartbeat : null;

  const activeMotors = motors
    ? (['FR', 'FL', 'BR', 'BL'] as const).filter((pos) => {
        const m = motors[pos];
        return m && typeof m !== 'number' && m.direction !== 'stopped' && (m.speed ?? 0) > 0;
      }).length
    : 0;

  const sats = gpsData?.satellites ?? 0;
  const hasFix = !!(
    gpsData?.connected &&
    typeof gpsData.latitude === 'number' &&
    typeof gpsData.longitude === 'number'
  );

  const alertsCount = alerts.length;
  const dataReady = mqttConnected && isRobotOnline && robotStatus != null;

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4 min-h-0">
      <ConnectionBar
        mqttConnected={mqttConnected}
        isRobotOnline={isRobotOnline}
        isMotorControllerOnline={isMotorControllerOnline}
        isEncoderReaderOnline={isEncoderReaderOnline}
        isDev={isDev}
        latency={latency}
        onReconnect={connect}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 shrink-0">
        <KpiTile
          icon={<Battery className="w-4 h-4" />}
          tone="kpatrol"
          label="PIN"
          value={fmt.pct(battery)}
          status={
            battery == null ? null : battery > 50 ? 'good' : battery > 20 ? 'warn' : 'bad'
          }
          statusLabel={battery == null ? null : battery > 50 ? 'Tốt' : battery > 20 ? 'TB' : 'Thấp'}
          footer={battery != null && <Progress value={battery} size="sm" />}
        />
        <KpiTile
          icon={<Satellite className="w-4 h-4" />}
          tone="online"
          label="GPS"
          value={hasFix ? fmt.coord(gpsData!.latitude!) : '—'}
          status={hasFix && sats >= 6 ? 'good' : hasFix ? 'warn' : null}
          statusLabel={hasFix ? `${sats} sat` : 'No fix'}
          footer={
            <p className="text-[11px] text-slate-500 truncate font-mono tabular-nums">
              {hasFix ? `Lon ${fmt.coord(gpsData!.longitude!)}` : 'Chờ vệ tinh…'}
            </p>
          }
        />
        <KpiTile
          icon={<Gauge className="w-4 h-4" />}
          tone="accent"
          label="TỐC ĐỘ (m/s)"
          value={fmt.speed(speed)}
          status={activeMotors > 0 ? 'good' : null}
          statusLabel={`${activeMotors}/4`}
          footer={
            <p className="text-[11px] text-slate-500 truncate font-mono tabular-nums">
              {speed == null ? 'Chờ motor…' : `Uptime ${fmt.duration(robotStatus?.uptime)}`}
            </p>
          }
        />
        <KpiTile
          icon={<AlertTriangle className="w-4 h-4" />}
          tone="warning"
          label="CẢNH BÁO"
          value={String(alertsCount)}
          status={alertsCount === 0 ? 'good' : 'warn'}
          statusLabel={alertsCount === 0 ? 'OK' : 'Mới'}
          footer={
            <p className="text-[11px] text-slate-500 truncate">
              {alertsCount === 0 ? 'Không có cảnh báo' : `${alertsCount} sự kiện gần đây`}
            </p>
          }
        />
      </div>

      {/* Main canvas */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)] gap-3 md:gap-4">
        {/* Live map — HUD card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-kpatrol-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[260px]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-[401]" />

          <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md ring-1 ring-slate-700/60 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.25)]">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  hasFix ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-orange-400',
                )}
              />
              {hasFix ? 'LIVE' : 'WAIT GPS'}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md ring-1 ring-slate-700/60 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-slate-400">
              <MapPin className="w-3 h-3 text-kpatrol-400" />
              <span className="hidden sm:inline">Phenikaa Campus</span>
              <span className="sm:hidden">Campus</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <PhenikaaMap
              gpsData={gpsData}
              showRoadNetwork
              followRobot
              height="100%"
              initialZoom={17}
            />
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md ring-1 ring-slate-700/60 text-[11px] font-mono tabular-nums text-cyan-300">
              {hasFix
                ? `${fmt.coord(gpsData!.latitude!, 5)}, ${fmt.coord(gpsData!.longitude!, 5)}`
                : '—, —'}
            </div>
            {!dataReady && (
              <div className="px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-md ring-1 ring-amber-500/40 text-[11px] uppercase tracking-wider font-bold text-amber-300">
                Đang chờ telemetry
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 md:gap-4 min-h-0">
          <div className="shrink-0 rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-accent-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/40 bg-slate-900/60">
              <Zap className="w-4 h-4 text-accent-400" />
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                Thao tác nhanh
              </span>
            </div>
            <div className="p-3 md:p-4">
              <QuickActions />
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-amber-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  Cảnh báo gần đây
                </span>
              </div>
              {alertsCount > 0 && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md ring-1 bg-amber-500/15 text-amber-300 ring-amber-500/30">
                  {alertsCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4">
              <RecentAlerts alerts={alerts} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components -----------------------------------------------------

const TONE_CLASS: Record<
  string,
  { ring: string; iconBg: string; iconFg: string; valueFg: string; glow: string }
> = {
  kpatrol: {
    ring: 'border-kpatrol-500/30',
    iconBg: 'bg-kpatrol-500/15',
    iconFg: 'text-kpatrol-400',
    valueFg: 'text-cyan-300',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.10)]',
  },
  accent: {
    ring: 'border-accent-500/30',
    iconBg: 'bg-accent-500/15',
    iconFg: 'text-accent-400',
    valueFg: 'text-accent-300',
    glow: 'shadow-[0_0_24px_rgba(167,139,250,0.10)]',
  },
  online: {
    ring: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconFg: 'text-emerald-400',
    valueFg: 'text-emerald-300',
    glow: 'shadow-[0_0_24px_rgba(74,222,128,0.10)]',
  },
  warning: {
    ring: 'border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconFg: 'text-amber-400',
    valueFg: 'text-amber-300',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.10)]',
  },
};

const STATUS_PILL: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  bad: 'bg-red-500/15 text-red-300 ring-red-500/30',
};

function KpiTile({
  icon,
  tone,
  label,
  value,
  status,
  statusLabel,
  footer,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONE_CLASS;
  label: string;
  value: string;
  status?: 'good' | 'warn' | 'bad' | null;
  statusLabel?: string | null;
  footer?: React.ReactNode;
}) {
  const t = TONE_CLASS[tone];
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border backdrop-blur-sm overflow-hidden p-3 md:p-3.5 flex flex-col gap-2',
        t.ring,
        t.glow,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="flex items-center justify-between gap-1">
        <div className={cn('p-1.5 rounded-lg', t.iconBg, t.iconFg)}>{icon}</div>
        {status && statusLabel && (
          <span
            className={cn(
              'text-[10px] font-black px-1.5 py-0.5 rounded-md ring-1 uppercase tracking-wider',
              STATUS_PILL[status],
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-xl md:text-2xl font-black truncate leading-tight tabular-nums',
            t.valueFg,
          )}
        >
          {value}
        </p>
        <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-500 font-bold truncate mt-0.5">
          {label}
        </p>
      </div>
      {footer && <div className="mt-0.5">{footer}</div>}
    </div>
  );
}

function ConnectionBar({
  mqttConnected,
  isRobotOnline,
  isMotorControllerOnline,
  isEncoderReaderOnline,
  isDev,
  latency,
  onReconnect,
}: {
  mqttConnected: boolean;
  isRobotOnline: boolean;
  isMotorControllerOnline: boolean;
  isEncoderReaderOnline: boolean;
  isDev: boolean;
  latency: number | null;
  onReconnect: () => void;
}) {
  const tone = !mqttConnected
    ? {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        fg: 'text-red-300',
        glow: 'shadow-[0_0_18px_rgba(239,68,68,0.15)]',
        Icon: WifiOff,
      }
    : !isRobotOnline
      ? {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/40',
          fg: 'text-amber-300',
          glow: 'shadow-[0_0_18px_rgba(251,191,36,0.15)]',
          Icon: Wifi,
        }
      : {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/40',
          fg: 'text-emerald-300',
          glow: 'shadow-[0_0_18px_rgba(74,222,128,0.18)]',
          Icon: Wifi,
        };

  const message = !mqttConnected
    ? 'Mất kết nối broker — đang thử lại…'
    : !isRobotOnline
      ? 'MQTT OK · Robot offline (chờ heartbeat)'
      : `Robot online${isDev && latency != null && latency < 5000 ? ` · ${latency}ms` : ''}`;

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-2xl border backdrop-blur-sm px-3 py-2.5 flex items-center justify-between gap-2 overflow-hidden',
        tone.bg,
        tone.border,
        tone.glow,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
      <div className="flex items-center gap-2 min-w-0">
        <tone.Icon className={cn('w-4 h-4 shrink-0', tone.fg)} />
        <p
          className={cn(
            'text-xs md:text-sm font-bold uppercase tracking-wider truncate',
            tone.fg,
          )}
        >
          {message}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDev && (
          <div className="hidden md:flex items-center gap-1">
            <Pill on={mqttConnected} label="MQTT" />
            <Pill on={isRobotOnline} label="Pi" />
            <Pill on={isMotorControllerOnline} label="S3" />
            <Pill on={isEncoderReaderOnline} label="Enc" amberOff />
          </div>
        )}
        {!mqttConnected && (
          <button
            onClick={onReconnect}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 ring-1 ring-red-500/40 text-red-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Kết nối lại</span>
          </button>
        )}
      </div>
    </div>
  );
}

function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-6 gap-2">
        <CheckCircle className="w-10 h-10 text-emerald-400/60" />
        <p className="text-sm text-slate-400">Chưa có cảnh báo nào</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
          All systems nominal
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const ago = Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 1000);
        const timeStr =
          ago < 60
            ? 'Vừa xong'
            : ago < 3600
              ? `${Math.floor(ago / 60)}p`
              : `${Math.floor(ago / 3600)}h`;
        return <AlertRow key={alert.id} type={alert.type} title={alert.title} message={alert.message} time={timeStr} />;
      })}
    </div>
  );
}

function AlertRow({
  type,
  title,
  message,
  time,
}: {
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  time: string;
}) {
  const config = {
    warning: { Icon: AlertTriangle, ring: 'ring-amber-500/30', bg: 'bg-amber-500/5', fg: 'text-amber-400' },
    info: { Icon: Activity, ring: 'ring-cyan-500/30', bg: 'bg-cyan-500/5', fg: 'text-cyan-400' },
    success: { Icon: CheckCircle, ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/5', fg: 'text-emerald-400' },
    error: { Icon: AlertTriangle, ring: 'ring-red-500/30', bg: 'bg-red-500/5', fg: 'text-red-400' },
  };
  const { Icon, ring, bg, fg } = config[type];
  return (
    <div className={cn('flex items-start gap-2 p-2.5 rounded-lg ring-1', ring, bg)}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', fg)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 truncate">{title}</p>
        <p className="text-xs text-slate-400 truncate">{message}</p>
      </div>
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">
        {time}
      </span>
    </div>
  );
}

function Pill({ on, label, amberOff }: { on: boolean; label: string; amberOff?: boolean }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-950/60 rounded-full ring-1 ring-slate-700/40">
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          on
            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]'
            : amberOff
              ? 'bg-amber-400'
              : 'bg-red-400',
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}
