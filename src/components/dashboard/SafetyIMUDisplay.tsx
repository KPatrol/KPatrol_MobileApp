'use client';

import { useMQTT } from '@/providers/MQTTProvider';
import { useAppMode } from '@/providers/AppModeProvider';
import { SafetyZone, ToFData, MotorPosition, DirectionSafety } from '@/lib/mqtt-config';
import { Activity, ArrowUp, ArrowDown, Circle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  K-Patrol Safety + IMU Display  —  Professional HMI Design
//  Exports: SafetyStatusCard | IMUStatusCard | SafetyIMUCompact
// ─────────────────────────────────────────────────────────────────────────────

// ── Zone palette ─────────────────────────────────────────────────────────────
const Z = {
  safe:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', hex: '#34d399', ring: 'ring-emerald-500/30' },
  slow:    { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/40',  hex: '#fbbf24', ring: 'ring-yellow-500/30' },
  caution: { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/40',  hex: '#fb923c', ring: 'ring-orange-500/30' },
  danger:  { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/40',     hex: '#f87171', ring: 'ring-red-500/30' },
} satisfies Record<SafetyZone, { bg: string; text: string; border: string; hex: string; ring: string }>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const MAX_GUIDE_PX = 72;   // guide line length from body edge (SVG px)
const SCALE_MM     = 600;  // mm that fills full guide

function distToPx(mm: number): number {
  return Math.min(MAX_GUIDE_PX, Math.max(0, (mm / SCALE_MM) * MAX_GUIDE_PX));
}

function distToZone(mm: number, th: { danger: number; caution: number; slow: number }): SafetyZone {
  if (!mm || mm <= 0 || mm >= 8000) return 'safe';
  if (mm < th.danger)  return 'danger';
  if (mm < th.caution) return 'caution';
  if (mm < th.slow)    return 'slow';
  return 'safe';
}

function fmtMm(mm: number | undefined): string {
  if (!mm || mm <= 0) return '---';
  if (mm >= 8000) return '∞';
  if (mm >= 1000) return `${(mm / 1000).toFixed(1)}m`;
  return `${Math.round(mm)}`;
}

// ── SVG Robot Sensor Config ───────────────────────────────────────────────────
// ViewBox: 300 × 310  |  Robot centre cx=150, cy=155
// Body: w=60, h=76  →  bx=120, by=117  →  edges: T=117 B=193 L=120 R=180
// Guide endpoints (body-edge origin + MAX_GUIDE_PX along direction vector):
//   FRONT       (150, 117) → up     → guide tip (150, 45)
//   FRONT_LEFT  (123, 125) → 30°CCW → guide tip  (87, 62)
//   FRONT_RIGHT (177, 125) → 30°CW  → guide tip (213, 62)
//   LEFT        (120, 155) → left   → guide tip  (48, 155)
//   RIGHT       (180, 155) → right  → guide tip (252, 155)
//   BACK        (150, 193) → down   → guide tip (150, 265)

interface BeamCfg {
  key: keyof Omit<ToFData, 'timestamp'>;
  shortLabel: string;
  ox: number; oy: number;
  dx: number; dy: number;
  lx: number; ly: number;        // fixed label position
  lAnchor: 'start' | 'middle' | 'end';
}

const BEAMS: BeamCfg[] = [
  { key: 'front',       shortLabel: 'F',    ox: 150, oy: 117, dx:  0,     dy: -1,      lx: 150, ly:  26, lAnchor: 'middle' },
  { key: 'front_left',  shortLabel: 'FL',   ox: 123, oy: 125, dx: -0.5,  dy: -0.866,  lx:  70, ly:  44, lAnchor: 'end'    },
  { key: 'front_right', shortLabel: 'FR',   ox: 177, oy: 125, dx:  0.5,  dy: -0.866,  lx: 230, ly:  44, lAnchor: 'start'  },
  { key: 'left',        shortLabel: 'L',    ox: 120, oy: 155, dx: -1,     dy:  0,      lx:  42, ly: 150, lAnchor: 'end'    },
  { key: 'right',       shortLabel: 'R',    ox: 180, oy: 155, dx:  1,     dy:  0,      lx: 258, ly: 150, lAnchor: 'start'  },
  { key: 'back',        shortLabel: 'B',    ox: 150, oy: 193, dx:  0,     dy:  1,      lx: 150, ly: 266, lAnchor: 'middle' },
];

const BEAM_WIDTH  = { safe: 1.5, slow: 2, caution: 3, danger: 4.5 };
const BEAM_GLOW   = { safe: 6,   slow: 8, caution: 10, danger: 14  };
const BEAM_ALPHA  = { safe: 0.06, slow: 0.10, caution: 0.18, danger: 0.28 };

// ── RobotSensorView ───────────────────────────────────────────────────────────
interface RobotSensorViewProps {
  tof: Partial<ToFData>;
  thresholds: { danger: number; caution: number; slow: number };
  /** 62% scale — compact side panel */
  mini?: boolean;
  /** 42% scale — inline bar usage */
  xsmini?: boolean;
  /** Fluid: fills container width, ignores scale, shows legend */
  fluid?: boolean;
}

function RobotSensorView({ tof, thresholds, mini, xsmini, fluid }: RobotSensorViewProps) {
  const cx = 150, cy = 155;
  const bx = 120, by = 117, bw = 60, bh = 76;

  // Zone ring radii (measured from cx,cy to where guide ends)
  const dangerR  = 33 + distToPx(thresholds.danger);
  const cautionR = 33 + distToPx(thresholds.caution);
  const slowR    = 33 + distToPx(thresholds.slow);

  const scale = xsmini ? 0.42 : mini ? 0.62 : 1;
  const vw = Math.round(300 * scale);
  const vh = Math.round(310 * scale);
  const isSmall = !fluid && (mini || xsmini);

  return (
    <svg
      viewBox="0 0 300 310"
      {...(fluid
        ? { className: 'w-full h-auto', style: { display: 'block' } }
        : { width: vw, height: vh, className: 'w-full', style: { maxHeight: xsmini ? 132 : mini ? 198 : 310 } }
      )}
    >
      <defs>
        <filter id="glow-s" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-m" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-l" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="body-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#2d3748" />
          <stop offset="100%" stopColor="#1a202c" />
        </radialGradient>
      </defs>

      {/* ── Zone reference rings ── */}
      <circle cx={cx} cy={cy} r={slowR}    fill="none" stroke="#fbbf2418" strokeWidth="1.5" strokeDasharray="5 3" />
      <circle cx={cx} cy={cy} r={cautionR} fill="none" stroke="#fb923c18" strokeWidth="1.5" strokeDasharray="5 3" />
      <circle cx={cx} cy={cy} r={dangerR}  fill="none" stroke="#f8717120" strokeWidth="1.5" strokeDasharray="4 2" />

      {/* ── Guide lines (full reach, dim dashed) ── */}
      {BEAMS.map(({ key, ox, oy, dx, dy }) => (
        <line key={`guide-${key}`}
          x1={ox} y1={oy}
          x2={ox + dx * MAX_GUIDE_PX} y2={oy + dy * MAX_GUIDE_PX}
          stroke="#374151" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.7"
        />
      ))}

      {/* ── ToF Beams ── */}
      {BEAMS.map(({ key, ox, oy, dx, dy, lx, ly, lAnchor, shortLabel }) => {
        const raw = tof[key] as number | undefined;
        const zone = distToZone(raw ?? 9999, thresholds);
        const color = Z[zone].hex;
        const px = distToPx(raw && raw < 8000 ? raw : SCALE_MM);
        const ex  = ox + dx * px;
        const ey  = oy + dy * px;
        const sw  = BEAM_WIDTH[zone];
        const gwW = BEAM_GLOW[zone];
        const gwA = BEAM_ALPHA[zone];
        const isDanger  = zone === 'danger';
        const isAlarm   = zone === 'danger' || zone === 'caution';
        const glowId    = isDanger ? 'glow-l' : isAlarm ? 'glow-m' : 'glow-s';
        const dotR      = isDanger ? 6 : isAlarm ? 5 : 3.5;
        const distText  = fmtMm(raw);

        return (
          <g key={key}>
            {/* Wide soft glow */}
            <line x1={ox} y1={oy} x2={ex} y2={ey}
              stroke={color} strokeWidth={gwW} strokeOpacity={gwA} strokeLinecap="round" />

            {/* Main beam */}
            <line x1={ox} y1={oy} x2={ex} y2={ey}
              stroke={color} strokeWidth={sw} strokeOpacity={0.95} strokeLinecap="round"
              filter={isAlarm ? `url(#${glowId})` : undefined}
            />

            {/* Endpoint dot */}
            <circle cx={ex} cy={ey} r={dotR} fill={color} opacity="0.95"
              filter={isAlarm ? `url(#${glowId})` : undefined}
            />

            {/* Pulse ring for alarm zones */}
            {isAlarm && (
              <circle cx={ex} cy={ey} r={dotR + 5} fill="none"
                stroke={color} strokeWidth="1.5" opacity="0.35" />
            )}

            {/* Fixed label: distance value */}
            <text x={lx} y={ly} textAnchor={lAnchor}
              fontSize={xsmini ? 8 : mini ? 9 : 10} fontFamily="monospace" fontWeight="700"
              fill={color} opacity="0.95">
              {distText}
            </text>

            {/* Fixed label: sensor name */}
            <text x={lx} y={ly + (xsmini ? 9 : mini ? 10 : 11)} textAnchor={lAnchor}
              fontSize={xsmini ? 6.5 : mini ? 7 : 8} fontFamily="ui-sans-serif, system-ui" fontWeight="400"
              fill="#6b7280">
              {shortLabel}
            </text>
          </g>
        );
      })}

      {/* ── Mecanum Wheels (4 corners) ── */}
      {[
        { x: 104, y: 119, flipped: false }, // FL
        { x: 180, y: 119, flipped: true  }, // FR
        { x: 104, y: 167, flipped: true  }, // BL
        { x: 180, y: 167, flipped: false }, // BR
      ].map(({ x, y, flipped }, i) => (
        <g key={`wheel-${i}`}>
          {/* Wheel body */}
          <rect x={x} y={y} width={16} height={24} rx="3"
            fill="#1a202c" stroke="#4a5568" strokeWidth="1.5" />
          {/* Mecanum diagonal roller lines */}
          {[0, 1, 2, 3].map(j => {
            const yOff = 3 + j * 5;
            return flipped
              ? <line key={j} x1={x+2} y1={y+yOff+5} x2={x+12} y2={y+yOff} stroke="#4a5568" strokeWidth="1" />
              : <line key={j} x1={x+2} y1={y+yOff} x2={x+12} y2={y+yOff+5} stroke="#4a5568" strokeWidth="1" />;
          })}
        </g>
      ))}

      {/* ── Robot body ── */}
      {/* Drop shadow */}
      <rect x={bx+3} y={by+3} width={bw} height={bh} rx="8" fill="#00000060" />

      {/* Body fill */}
      <rect x={bx} y={by} width={bw} height={bh} rx="8"
        fill="url(#body-grad)" stroke="#4a5568" strokeWidth="1.5" />

      {/* Body front highlight stripe */}
      <rect x={bx} y={by} width={bw} height={28} rx="8"
        fill="#ffffff08" />

      {/* Front direction arrow (chevron) */}
      <polygon
        points={`${cx},${by-14} ${cx-9},${by-1} ${cx+9},${by-1}`}
        fill="#60a5fa" opacity="0.95"
        filter="url(#glow-s)"
      />

      {/* Center cross */}
      <line x1={cx-10} y1={cy} x2={cx+10} y2={cy} stroke="#4a5568" strokeWidth="0.8" />
      <line x1={cx} y1={cy-12} x2={cx} y2={cy+12} stroke="#4a5568" strokeWidth="0.8" />

      {/* Logo text */}
      <text x={cx} y={cy-3} textAnchor="middle"
        fontSize="7.5" fontFamily="ui-monospace, monospace" fontWeight="700"
        fill="#94a3b8" letterSpacing="1">K-PATROL</text>
      <text x={cx} y={cy+9} textAnchor="middle"
        fontSize="6.5" fontFamily="ui-sans-serif, system-ui"
        fill="#475569">MECANUM 4WD</text>

      {/* FRONT / BACK fixed direction labels */}
      <text x={cx} y={by-22} textAnchor="middle"
        fontSize="8" fontFamily="ui-sans-serif, system-ui" fontWeight="700"
        fill="#60a5fa" letterSpacing="1">▲ FRONT</text>
      <text x={cx} y={by+bh+17} textAnchor="middle"
        fontSize="8" fontFamily="ui-sans-serif, system-ui"
        fill="#475569" letterSpacing="1">▼ BACK</text>

      {/* ── Zone legend (bottom strip) — 2 rows × 2 cols ── */}
      {!isSmall && (
        <g>
          {([
            ['#f87171', `DANGER <${thresholds.danger}`],
            ['#fb923c', `CAUTION <${thresholds.caution}`],
          ] as [string, string][]).map(([hex, label], i) => (
            <g key={label} transform={`translate(${8 + i * 150}, 287)`}>
              <circle cx="4" cy="-3" r="3.5" fill={hex} opacity="0.9" />
              <text x="11" fontSize="7.5" fontFamily="ui-monospace, monospace" fill={hex} opacity="0.9">{label}</text>
            </g>
          ))}
          {([
            ['#fbbf24', `SLOW <${thresholds.slow}`],
            ['#34d399', 'SAFE'],
          ] as [string, string][]).map(([hex, label], i) => (
            <g key={label} transform={`translate(${8 + i * 150}, 300)`}>
              <circle cx="4" cy="-3" r="3.5" fill={hex} opacity="0.9" />
              <text x="11" fontSize="7.5" fontFamily="ui-monospace, monospace" fill={hex} opacity="0.9">{label}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

// ── ZoneStatsBar ──────────────────────────────────────────────────────────────
interface ZoneStatsBarProps {
  zone: SafetyZone;
  minDist: number | undefined;
  speedMult: number | undefined;
  safetyEnabled: boolean;
  onToggle: () => void;
}

function ZoneStatsBar({ zone, minDist, speedMult, safetyEnabled, onToggle }: ZoneStatsBarProps) {
  const zs = Z[zone];
  const speedPct = Math.round((speedMult ?? 1) * 100);
  const isDanger = zone === 'danger';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${zs.bg} ${zs.border} transition-all`}>
      {/* Zone pill */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20`}>
        <span className="relative flex h-2 w-2">
          {isDanger && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-400`} />}
          <span className={`relative inline-flex rounded-full h-2 w-2`} style={{ background: zs.hex }} />
        </span>
        <span className={`text-xs font-bold uppercase tracking-wider ${zs.text}`}>{zone}</span>
      </div>

      {/* Distance */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider leading-none">Dist</span>
        <span className={`text-base font-mono font-bold leading-tight ${zs.text}`}>
          {minDist != null ? minDist : '---'}
          <span className="text-[9px] font-normal text-slate-500 ml-0.5">mm</span>
        </span>
      </div>

      {/* Speed */}
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-[9px] text-slate-500 uppercase tracking-wider leading-none">Speed</span>
        <span className={`text-base font-mono font-bold leading-tight ${zs.text}`}>
          {speedPct}%
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Safety toggle */}
      <button onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
          safetyEnabled
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-slate-700/60 text-slate-400 border-slate-600/40 hover:bg-slate-700'
        }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${safetyEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        {safetyEnabled ? 'SAFETY ON' : 'SAFETY OFF'}
      </button>
    </div>
  );
}

// ── DirectionSafetyBar — V5 per-direction blocked/allowed indicators ─────────
interface DirectionSafetyBarProps {
  directions: {
    forward: DirectionSafety;
    backward: DirectionSafety;
    left: DirectionSafety;
    right: DirectionSafety;
  };
}

const DIR_LABELS: { key: keyof DirectionSafetyBarProps['directions']; label: string; icon: string }[] = [
  { key: 'forward',  label: 'FWD', icon: '↑' },
  { key: 'left',     label: 'LEFT', icon: '←' },
  { key: 'right',    label: 'RIGHT', icon: '→' },
  { key: 'backward', label: 'BACK', icon: '↓' },
];

function DirectionSafetyBar({ directions }: DirectionSafetyBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider mr-1">Dir</span>
      {DIR_LABELS.map(({ key, label, icon }) => {
        const dir = directions[key];
        const blocked = dir.blocked;
        const zs = Z[dir.zone];
        return (
          <div key={key}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold tracking-wider transition-all ${
              blocked
                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                : `${zs.bg} ${zs.border} ${zs.text}`
            }`}
            title={`${label}: ${dir.distance}mm — ${dir.zone}${blocked ? ' (BLOCKED)' : ''}`}
          >
            <span className="text-xs">{icon}</span>
            <span>{blocked ? 'BLOCK' : label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── SafetyStatusCard — Full card for Dashboard ────────────────────────────────
export function SafetyStatusCard() {
  const { safetyStatus, safetyEnabled, setSafetyEnabled } = useMQTT();

  const zone  = safetyStatus?.zone   ?? 'safe';
  const th    = safetyStatus?.thresholds ?? { danger: 150, caution: 250, slow: 500 };
  const tof   = safetyStatus?.tof    ?? {};

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-700/40">
        <div className="p-1.5 rounded-lg bg-slate-700/50">
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">ToF Safety Map</h3>
        <span className="ml-auto text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
          6 × VL53L0X
        </span>
      </div>

      {/* Zone stats bar */}
      <div className="px-4 py-3">
        <ZoneStatsBar
          zone={zone}
          minDist={safetyStatus?.min_distance}
          speedMult={safetyStatus?.speed_multiplier}
          safetyEnabled={safetyEnabled}
          onToggle={() => setSafetyEnabled(!safetyEnabled)}
        />
      </div>

      {/* V5: Per-direction safety indicators */}
      {safetyStatus?.directions && safetyEnabled && (
        <div className="px-4 pb-2">
          <DirectionSafetyBar directions={safetyStatus.directions} />
        </div>
      )}

      {/* Robot diagram */}
      <div className="px-3 pb-3">
        <div className="bg-slate-950/50 rounded-xl border border-slate-700/30 p-1">
          <RobotSensorView tof={tof} thresholds={th} />
        </div>
      </div>

      {/* Disabled notice */}
      {!safetyEnabled && (
        <div className="mx-4 mb-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          <span className="text-amber-400 text-sm">⚠</span>
          <span className="text-amber-400 text-xs font-medium">Safety System Disabled — robot will not auto-stop</span>
        </div>
      )}
    </div>
  );
}

// ── CompassRose ───────────────────────────────────────────────────────────────
function CompassRose({ yaw, size = 160 }: { yaw: number; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;

  const cardinals = [
    { label: 'N', angle: 0,   fill: '#f87171' },
    { label: 'E', angle: 90,  fill: '#94a3b8' },
    { label: 'S', angle: 180, fill: '#64748b' },
    { label: 'W', angle: 270, fill: '#94a3b8' },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <defs>
        <radialGradient id="compass-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <filter id="needle-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer bezel */}
      <circle cx={cx} cy={cy} r={r+2} fill="none" stroke="#334155" strokeWidth="3" />
      {/* Background */}
      <circle cx={cx} cy={cy} r={r} fill="url(#compass-bg)" />

      {/* Degree tick marks (every 10°, major every 30°) */}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const isMajor = i % 3 === 0;
        const r1 = r - (isMajor ? 12 : 7);
        const r2 = r - 2;
        return (
          <line key={i}
            x1={cx + r1 * Math.sin(a)} y1={cy - r1 * Math.cos(a)}
            x2={cx + r2 * Math.sin(a)} y2={cy - r2 * Math.cos(a)}
            stroke={isMajor ? '#475569' : '#334155'}
            strokeWidth={isMajor ? 1.5 : 0.8}
          />
        );
      })}

      {/* Cardinal labels */}
      {cardinals.map(({ label, angle, fill }) => {
        const a = (angle * Math.PI) / 180;
        const lr = r - 22;
        return (
          <text key={label}
            x={cx + lr * Math.sin(a)} y={cy - lr * Math.cos(a) + 4}
            textAnchor="middle" fontSize="11" fontWeight="700"
            fontFamily="ui-sans-serif, system-ui" fill={fill}>
            {label}
          </text>
        );
      })}

      {/* Rotating needle group */}
      <g transform={`rotate(${yaw}, ${cx}, ${cy})`}>
        {/* North half (red) */}
        <polygon
          points={`${cx},${cy - r + 16} ${cx - 7},${cy + 8} ${cx + 7},${cy + 8}`}
          fill="#f87171"
          filter="url(#needle-glow)"
          opacity="0.95"
        />
        {/* South half (slate) */}
        <polygon
          points={`${cx},${cy + r - 16} ${cx - 7},${cy - 8} ${cx + 7},${cy - 8}`}
          fill="#334155"
          opacity="0.95"
        />
      </g>

      {/* Center cap */}
      <circle cx={cx} cy={cy} r="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="3" fill="#94a3b8" />
    </svg>
  );
}

// ── AttitudeBars ──────────────────────────────────────────────────────────────
function AttitudeBar({
  label, value, maxAngle = 45, color,
}: {
  label: string; value: number; maxAngle?: number; color: string;
}) {
  const pct = Math.max(-100, Math.min(100, (value / maxAngle) * 100));
  const barColor = Math.abs(value) > 30 ? '#f87171' : Math.abs(value) > 15 ? '#fbbf24' : color;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color: barColor }}>
          {value >= 0 ? '+' : ''}{value.toFixed(1)}°
        </span>
      </div>
      <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-700/50">
        {/* Center mark */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-slate-600 z-10" />
        {/* Bar */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-150"
          style={{
            background: barColor,
            left:  pct >= 0 ? '50%' : `${50 + pct / 2}%`,
            width: `${Math.abs(pct) / 2}%`,
            minWidth: Math.abs(value) > 0.5 ? '3px' : '0px',
          }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-slate-700">
        <span>-{maxAngle}°</span><span>+{maxAngle}°</span>
      </div>
    </div>
  );
}

// ── ArtificialHorizon ─────────────────────────────────────────────────────────
function ArtificialHorizon({ pitch, roll }: { pitch: number; roll: number }) {
  // Horizon shifts up when pitching forward (positive pitch = nose up)
  const horizonShift = (pitch / 90) * 28;

  return (
    <div className="rounded-xl overflow-hidden bg-slate-950 ring-1 ring-slate-700/50">
      <svg viewBox="0 0 220 56" className="w-full" height="56">
        <defs>
          <clipPath id="horizon-clip">
            <rect x="0" y="0" width="220" height="56" />
          </clipPath>
        </defs>

        {/* Sky + Ground rotating with roll, shifting with pitch */}
        <g clipPath="url(#horizon-clip)"
          transform={`rotate(${-roll}, 110, 28) translate(0, ${-horizonShift})`}>
          {/* Sky gradient */}
          <rect x="-60" y="-60" width="340" height="92" fill="#0c1a2e" />
          {/* Ground gradient */}
          <rect x="-60" y="32" width="340" height="92" fill="#1c0e00" />
          {/* Horizon line */}
          <line x1="-60" y1="32" x2="340" y2="32" stroke="#475569" strokeWidth="1" />
          {/* Pitch ladder marks */}
          {[-10, -5, 5, 10].map(deg => {
            const yOff = 32 - (deg / 90) * 28;
            const lw = Math.abs(deg) === 10 ? 32 : 22;
            return (
              <g key={deg}>
                <line x1={110 - lw} y1={yOff} x2={110 + lw} y2={yOff}
                  stroke="#475569" strokeWidth="0.8" />
                <text x={110 + lw + 4} y={yOff + 3} fontSize="6" fill="#475569"
                  fontFamily="ui-monospace, monospace">{deg > 0 ? `+${deg}` : deg}°</text>
              </g>
            );
          })}
        </g>

        {/* Fixed aircraft reticle */}
        <line x1="62"  y1="28" x2="86"  y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="134" y1="28" x2="158" y2="28" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="110" y1="20" x2="110" y2="36" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="110" cy="28" r="4" fill="none" stroke="#fbbf24" strokeWidth="1.5" />

        {/* Left & right labels */}
        <text x="4"  y="14" fontSize="7" fill="#60a5fa" fontFamily="ui-sans-serif, system-ui">SKY</text>
        <text x="4"  y="52" fontSize="7" fill="#92400e" fontFamily="ui-sans-serif, system-ui">GND</text>

        {/* P/R readout */}
        <text x="148" y="52" fontSize="7" fontFamily="ui-monospace, monospace" fill="#64748b">
          P{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}° R{roll >= 0 ? '+' : ''}{roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
}

// ── IMUStatusCard — Full card for Dashboard ───────────────────────────────────
export function IMUStatusCard() {
  const { imuData } = useMQTT();

  const yaw   = imuData?.yaw   ?? 0;
  const pitch = imuData?.pitch ?? 0;
  const roll  = imuData?.roll  ?? 0;
  const acc   = imuData?.accuracy ?? 0;

  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal  = cardinals[Math.round(yaw / 45) % 8] ?? 'N';
  const accColor  = acc >= 3 ? 'text-emerald-400' : acc >= 2 ? 'text-yellow-400' : acc >= 1 ? 'text-orange-400' : 'text-red-400';
  const accLabel  = acc >= 3 ? 'Calibrated' : acc >= 2 ? 'Good' : acc >= 1 ? 'Fair' : 'Uncal';

  const pitchColor = Math.abs(pitch) > 30 ? '#f87171' : Math.abs(pitch) > 15 ? '#fbbf24' : '#34d399';
  const rollColor  = Math.abs(roll)  > 30 ? '#f87171' : Math.abs(roll)  > 15 ? '#fbbf24' : '#a78bfa';

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-700/40">
        <div className="p-1.5 rounded-lg bg-slate-700/50">
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">IMU Orientation</h3>
        <span className="ml-auto text-[10px] font-mono bg-slate-800/60 px-2 py-0.5 rounded text-slate-500">BNO08x</span>
      </div>

      <div className="px-4 py-4">
        {/* Compass + stats row */}
        <div className="flex gap-4 items-center">
          {/* Compass */}
          <div className="flex-shrink-0">
            <CompassRose yaw={yaw} size={140} />
          </div>

          {/* Right column */}
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Heading */}
            <div className="bg-slate-950/60 rounded-xl px-3 py-3 text-center ring-1 ring-slate-700/40">
              <p className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">Heading</p>
              <p className="text-3xl font-mono font-bold text-cyan-400 leading-none">
                {yaw.toFixed(1)}<span className="text-base text-cyan-600">°</span>
              </p>
              <p className="text-sm font-bold text-slate-300 mt-0.5">{cardinal}</p>
            </div>

            {/* Pitch + Roll inline */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/60 rounded-lg px-2 py-2 text-center ring-1 ring-slate-700/40">
                <p className="text-[8px] text-slate-500 uppercase leading-none mb-1">Pitch</p>
                <p className="text-lg font-mono font-bold leading-none" style={{ color: pitchColor }}>
                  {pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°
                </p>
              </div>
              <div className="bg-slate-950/60 rounded-lg px-2 py-2 text-center ring-1 ring-slate-700/40">
                <p className="text-[8px] text-slate-500 uppercase leading-none mb-1">Roll</p>
                <p className="text-lg font-mono font-bold leading-none" style={{ color: rollColor }}>
                  {roll >= 0 ? '+' : ''}{roll.toFixed(1)}°
                </p>
              </div>
            </div>

            {/* Calibration */}
            <div className={`bg-slate-950/60 rounded-lg px-3 py-2 ring-1 ring-slate-700/40 flex items-center justify-between`}>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Mag Cal</span>
              <div className="flex items-center gap-1.5">
                <span className="flex gap-0.5">
                  {Array.from({ length: 3 }, (_, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full ${i < Math.round(acc) ? accColor.replace('text-', 'bg-') : 'bg-slate-700'}`} />
                  ))}
                </span>
                <span className={`text-xs font-semibold ${accColor}`}>{accLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pitch / Roll bars */}
        <div className="mt-3 space-y-2 bg-slate-950/40 rounded-xl p-3 ring-1 ring-slate-700/30">
          <AttitudeBar label="Pitch" value={pitch} color="#34d399" />
          <AttitudeBar label="Roll"  value={roll}  color="#a78bfa" />
        </div>
      </div>
    </div>
  );
}

// ── SafetyIMUBar — Compact horizontal panel for ControlView ──────────────────
export function SafetyIMUBar() {
  const { safetyStatus, imuData, safetyEnabled, toggleSafety } = useMQTT();

  const zone  = safetyStatus?.zone   ?? 'safe';
  const th    = safetyStatus?.thresholds ?? { danger: 150, caution: 250, slow: 500 };
  const tof   = safetyStatus?.tof    ?? {};
  const zs    = Z[zone];
  const yaw   = imuData?.yaw   ?? 0;
  const pitch = imuData?.pitch ?? 0;
  const roll  = imuData?.roll  ?? 0;
  const acc   = imuData?.accuracy ?? 0;
  const isDanger = zone === 'danger';

  const cardinals  = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal   = cardinals[Math.round(yaw / 45) % 8] ?? 'N';
  const accColor   = acc >= 3 ? 'text-emerald-400' : acc >= 2 ? 'text-yellow-400' : acc >= 1 ? 'text-orange-400' : 'text-red-400';
  const pitchColor = Math.abs(pitch) > 30 ? '#f87171' : Math.abs(pitch) > 15 ? '#fbbf24' : '#34d399';
  const rollColor  = Math.abs(roll)  > 30 ? '#f87171' : Math.abs(roll)  > 15 ? '#fbbf24' : '#a78bfa';

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
      {/* ── Top status bar ── */}
      <div className={`flex items-center gap-2.5 px-3 py-2 border-b border-slate-700/40 ${zs.bg}`}>
        {/* Zone */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          {isDanger && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
          <span className="relative rounded-full h-2 w-2" style={{ background: zs.hex }} />
        </span>
        <span className={`text-xs font-bold uppercase tracking-wider ${zs.text}`}>{zone}</span>
        <span className={`text-xs font-mono font-semibold ${zs.text}`}>{safetyStatus?.min_distance ?? '---'}<span className="text-[9px] text-slate-500 ml-0.5">mm</span></span>
        <span className={`text-xs ${zs.text} opacity-70`}>{Math.round((safetyStatus?.speed_multiplier ?? 1) * 100)}%</span>

        <span className="text-slate-700 text-xs">│</span>

        {/* IMU summary */}
        <span className="text-xs font-mono font-bold text-cyan-400">{yaw.toFixed(1)}°</span>
        <span className="text-xs font-semibold text-slate-400">{cardinal}</span>
        <span className="text-xs font-mono" style={{ color: pitchColor }}>P{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°</span>
        <span className="text-xs font-mono" style={{ color: rollColor }}>R{roll >= 0 ? '+' : ''}{roll.toFixed(1)}°</span>

        <span className="text-slate-700 text-xs">│</span>
        <span className={`text-[9px] font-mono ${accColor}`}>Cal {Math.round(acc)}/3</span>

        <div className="flex-1" />

        {/* Safety toggle */}
        <button onClick={toggleSafety}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex-shrink-0 ${
            safetyEnabled
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-700/60 text-slate-400 border-slate-600/40 hover:bg-slate-700'
          }`}>
          {safetyEnabled ? 'SAFE ✓' : 'SAFE ✗'}
        </button>
      </div>

      {/* ── Body: Robot diagram + Compass ── */}
      <div className="flex divide-x divide-slate-700/30">
        {/* Robot ToF diagram (xsmini) */}
        <div className="flex-1 bg-slate-950/40 flex items-center justify-center py-0.5">
          <RobotSensorView tof={tof} thresholds={th} xsmini />
        </div>

        {/* Compass + heading + P/R */}
        <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-2 min-w-[120px]">
          <CompassRose yaw={yaw} size={88} />
          <div className="text-center">
            <p className="text-lg font-mono font-bold text-cyan-400 leading-none">
              {yaw.toFixed(1)}<span className="text-xs text-cyan-600/70">°</span>
            </p>
            <p className="text-xs font-bold text-slate-300 leading-none">{cardinal}</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-[7px] text-slate-500 uppercase leading-none">Pitch</p>
              <p className="text-[11px] font-mono font-bold" style={{ color: pitchColor }}>
                {pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°
              </p>
            </div>
            <div className="text-center">
              <p className="text-[7px] text-slate-500 uppercase leading-none">Roll</p>
              <p className="text-[11px] font-mono font-bold" style={{ color: rollColor }}>
                {roll >= 0 ? '+' : ''}{roll.toFixed(1)}°
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SafetyCard — compact Safety-only card for ControlView right column ───────
export function SafetyCard({ className = '' }: { className?: string }) {
  const { safetyStatus, safetyEnabled, toggleSafety } = useMQTT();

  const zone = safetyStatus?.zone ?? 'safe';
  const th   = safetyStatus?.thresholds ?? { danger: 150, caution: 250, slow: 500 };
  const tof  = safetyStatus?.tof ?? {};
  const zs   = Z[zone];
  const isDanger = zone === 'danger';
  const speedPct = Math.round((safetyStatus?.speed_multiplier ?? 1) * 100);

  return (
    <div className={`bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">ToF Safety</span>
        <span className="text-[9px] text-slate-600 bg-slate-800/60 px-1 py-0.5 rounded font-mono ml-1">6×VL53L0X</span>
        <div className="flex-1" />
        {/* Zone pill */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${zs.bg} border ${zs.border}`}>
          <span className="relative flex h-1.5 w-1.5">
            {isDanger && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
            <span className="relative rounded-full h-1.5 w-1.5" style={{ background: zs.hex }} />
          </span>
          <span className={zs.text}>{zone}</span>
          <span className={`font-mono ${zs.text}`}>{safetyStatus?.min_distance ?? '---'}mm</span>
          <span className={`${zs.text} opacity-70`}>{speedPct}%</span>
        </div>
      </div>

      {/* Radar — fluid fills column width, flex-1 to grow */}
      <div className="px-1 pb-1 bg-slate-950/40 mx-2 mb-2 rounded-xl border border-slate-700/30 flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <RobotSensorView tof={tof} thresholds={th} fluid />
      </div>

      {/* Safety toggle */}
      <div className="px-3 pb-2.5 flex-shrink-0">
        <button onClick={toggleSafety} className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
          safetyEnabled
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
            : 'bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${safetyEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {safetyEnabled ? 'SAFETY ON' : 'SAFETY OFF'}
        </button>
      </div>
    </div>
  );
}

// ── Tilt status for IMU pitch/roll: easy-to-read for end users ─
function tiltStatus(maxTilt: number): { label: string; color: string; bg: string; ring: string } {
  if (maxTilt < 5)  return { label: 'Cân bằng',     color: '#34d399', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30' };
  if (maxTilt < 15) return { label: 'Hơi nghiêng',  color: '#fbbf24', bg: 'bg-yellow-500/15',  ring: 'ring-yellow-500/30' };
  if (maxTilt < 25) return { label: 'Nghiêng',      color: '#fb923c', bg: 'bg-orange-500/15',  ring: 'ring-orange-500/30' };
  return                    { label: 'Nghiêng mạnh', color: '#f87171', bg: 'bg-red-500/15',     ring: 'ring-red-500/30' };
}

// ── BubbleLevel — smartphone-style level indicator showing pitch/roll as a bubble ─
function BubbleLevel({ pitch, roll, size = 64, maxAngle = 30 }: {
  pitch: number; roll: number; size?: number; maxAngle?: number;
}) {
  const r = size / 2;
  // roll → x offset (right tilt → bubble right); pitch → y offset (nose-down → bubble forward = up on screen)
  const cx = Math.max(-1, Math.min(1, roll / maxAngle));
  const cy = Math.max(-1, Math.min(1, -pitch / maxAngle));
  const maxR = r - 8;
  const dist = Math.hypot(cx, cy);
  const bx = (dist > 1 ? cx / dist : cx) * maxR;
  const by = (dist > 1 ? cy / dist : cy) * maxR;
  const tilt = Math.max(Math.abs(pitch), Math.abs(roll));
  const ts = tiltStatus(tilt);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-700/60 bg-slate-950/40" />
      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-px h-full bg-slate-700/40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-px w-full bg-slate-700/40" />
      </div>
      {/* Inner level circle (target) */}
      <div
        className="absolute rounded-full border border-emerald-500/30"
        style={{
          width: 14, height: 14,
          left: r - 7, top: r - 7,
        }}
      />
      {/* Bubble — moves with tilt */}
      <div
        className="absolute rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all duration-150"
        style={{
          width: 12, height: 12,
          background: ts.color,
          left: r - 6 + bx,
          top: r - 6 + by,
        }}
      />
    </div>
  );
}

// ── IMUCard — IMU card for ControlView,  compact=true → vertical square layout ─
export function IMUCard({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { imuData } = useMQTT();
  const { isDev } = useAppMode();

  const yaw   = imuData?.yaw   ?? 0;
  const pitch = imuData?.pitch ?? 0;
  const roll  = imuData?.roll  ?? 0;
  const acc   = imuData?.accuracy ?? 0;

  const cardinalsShort = ['B', 'ĐB', 'Đ', 'ĐN', 'N', 'TN', 'T', 'TB'];
  const cardinalsFull  = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  const cardinalIdx = ((Math.round(yaw / 45) % 8) + 8) % 8;
  const cardinal      = cardinalsShort[cardinalIdx] ?? 'B';
  const cardinalFull  = cardinalsFull[cardinalIdx]  ?? 'Bắc';
  const tilt = Math.max(Math.abs(pitch), Math.abs(roll));
  const ts = tiltStatus(tilt);
  const pitchColor = Math.abs(pitch) > 30 ? '#f87171' : Math.abs(pitch) > 15 ? '#fbbf24' : '#34d399';
  const rollColor  = Math.abs(roll)  > 30 ? '#f87171' : Math.abs(roll)  > 15 ? '#fbbf24' : '#a78bfa';
  const accColorHex = acc >= 3 ? '#34d399' : acc >= 2 ? '#fbbf24' : acc >= 1 ? '#fb923c' : '#f87171';
  const accLabel    = acc >= 3 ? 'Chuẩn' : acc >= 2 ? 'Tốt' : acc >= 1 ? 'Tạm' : 'Chưa hiệu chuẩn';

  if (compact) {
    // ── Compact vertical layout for 40%-width column ──
    // User-friendly: hướng la bàn tiếng Việt + bubble level + tilt status (no raw degrees by default)
    return (
      <div className={`bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl flex flex-col h-full ${className}`}>
        {/* Header — 1 line */}
        <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5 flex-shrink-0">
          <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex-1">Hướng & Cân bằng</span>
          {/* Cal dots — with tooltip-friendly label */}
          <div className="flex items-center gap-0.5" title={`Hiệu chuẩn: ${accLabel}`}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: i < Math.round(acc) ? accColorHex : '#334155' }} />
            ))}
          </div>
        </div>

        {/* Compass centered — flex-1 to take max vertical space */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <CompassRose yaw={yaw} size={104} />
        </div>

        {/* Heading — Vietnamese cardinal */}
        <div className="mx-2 mb-1 bg-slate-950/70 rounded-xl px-2 py-1 text-center ring-1 ring-slate-700/40 flex-shrink-0">
          <p className="text-[7px] uppercase tracking-widest text-slate-500 leading-none">Hướng</p>
          <p className="text-base font-bold text-cyan-400 leading-tight">
            {cardinalFull}
            {isDev && (
              <span className="ml-1.5 font-mono text-[10px] text-cyan-600">
                {yaw.toFixed(0)}°
              </span>
            )}
          </p>
        </div>

        {/* Tilt status + bubble level — friendly view */}
        <div className={`mx-2 mb-2 rounded-xl px-2 py-1.5 flex items-center gap-2 ring-1 ${ts.bg} ${ts.ring} flex-shrink-0`}>
          <BubbleLevel pitch={pitch} roll={roll} size={48} maxAngle={30} />
          <div className="flex-1 min-w-0">
            <p className="text-[8px] uppercase tracking-widest text-slate-400 leading-none">Độ nghiêng</p>
            <p className="text-[12px] font-bold leading-tight truncate" style={{ color: ts.color }}>
              {ts.label}
            </p>
            {isDev && (
              <p className="text-[9px] font-mono text-slate-500 leading-tight">
                P <span style={{ color: pitchColor }}>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°</span>
                <span className="mx-0.5">·</span>
                R <span style={{ color: rollColor }}>{roll >= 0 ? '+' : ''}{roll.toFixed(1)}°</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default horizontal layout ──
  return (
    <div className={`bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">IMU</span>
        <span className="text-[9px] text-slate-600 bg-slate-800/60 px-1 py-0.5 rounded font-mono ml-1">BNO08x</span>
        <div className="flex items-center gap-1 ml-auto">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="w-2 h-2 rounded-full"
              style={{ background: i < Math.round(acc) ? accColorHex : '#334155' }} />
          ))}
          <span className="text-[10px] font-mono ml-1" style={{ color: accColorHex }}>
            {acc >= 3 ? 'Cal' : acc >= 2 ? 'Good' : acc >= 1 ? 'Fair' : 'Uncal'}
          </span>
        </div>
      </div>

      {/* Body: compass left, data right */}
      <div className="flex items-center gap-2.5 px-3 pb-3">
        <CompassRose yaw={yaw} size={76} />

        <div className="flex-1 flex flex-col gap-1.5">
          {/* Heading */}
          <div className="bg-slate-950/60 rounded-lg px-2 py-1.5 text-center ring-1 ring-slate-700/40">
            <p className="text-[8px] uppercase tracking-widest text-slate-500 leading-none">Heading</p>
            <p className="text-xl font-mono font-bold text-cyan-400 leading-tight">
              {yaw.toFixed(0)}<span className="text-xs text-cyan-600">°</span>
              <span className="text-sm font-bold text-slate-300 ml-1">{cardinal}</span>
            </p>
          </div>
          {/* Pitch + Roll */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-950/60 rounded-lg px-2 py-1.5 text-center ring-1 ring-slate-700/40">
              <p className="text-[8px] text-slate-500 uppercase leading-none">Pitch</p>
              <p className="text-sm font-mono font-bold" style={{ color: pitchColor }}>
                {pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°
              </p>
            </div>
            <div className="bg-slate-950/60 rounded-lg px-2 py-1.5 text-center ring-1 ring-slate-700/40">
              <p className="text-[8px] text-slate-500 uppercase leading-none">Roll</p>
              <p className="text-sm font-mono font-bold" style={{ color: rollColor }}>
                {roll >= 0 ? '+' : ''}{roll.toFixed(1)}°
              </p>
            </div>
          </div>
          {/* Attitude bars */}
          <div className="bg-slate-950/40 rounded-lg p-1.5 ring-1 ring-slate-700/30 space-y-1">
            <AttitudeBar label="P" value={pitch} maxAngle={45} color="#34d399" />
            <AttitudeBar label="R" value={roll}  maxAngle={45} color="#a78bfa" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CombinedRobotPanel() {
  const { safetyStatus, imuData, safetyEnabled, toggleSafety,
          isMotorControllerOnline, isEncoderReaderOnline,
          motors, encoders } = useMQTT();

  const zone  = safetyStatus?.zone   ?? 'safe';
  const th    = safetyStatus?.thresholds ?? { danger: 150, caution: 250, slow: 500 };
  const tof   = safetyStatus?.tof    ?? {};
  const zs    = Z[zone];
  const isDanger = zone === 'danger';

  const yaw   = imuData?.yaw   ?? 0;
  const pitch = imuData?.pitch ?? 0;
  const roll  = imuData?.roll  ?? 0;
  const acc   = imuData?.accuracy ?? 0;

  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal  = cardinals[Math.round(yaw / 45) % 8] ?? 'N';
  const pitchColor = Math.abs(pitch) > 30 ? '#f87171' : Math.abs(pitch) > 15 ? '#fbbf24' : '#34d399';
  const rollColor  = Math.abs(roll)  > 30 ? '#f87171' : Math.abs(roll)  > 15 ? '#fbbf24' : '#a78bfa';
  const accColorHex = acc >= 3 ? '#34d399' : acc >= 2 ? '#fbbf24' : acc >= 1 ? '#fb923c' : '#f87171';

  const motorList: { id: MotorPosition; label: string }[] = [
    { id: 'FL', label: 'Trước Trái' },
    { id: 'FR', label: 'Trước Phải' },
    { id: 'BL', label: 'Sau Trái' },
    { id: 'BR', label: 'Sau Phải' },
  ];

  const activeMotors = motors ? motorList.filter(({ id }) => {
    const m = motors[id]; return m?.direction !== 'stopped' && (m?.speed ?? 0) > 0;
  }).length : 0;

  const speedPct = Math.round((safetyStatus?.speed_multiplier ?? 1) * 100);

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">

      {/* ── Section 1: Safety ── */}
      <div className="px-3 pt-3 pb-2">
        {/* Safety header row */}
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">ToF Safety</span>
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded ml-1">6×VL53L0X</span>
          <div className="flex-1" />
          {/* Zone badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${zs.bg} border ${zs.border}`}>
            <span className="relative flex h-2 w-2">
              {isDanger && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
              <span className="relative rounded-full h-2 w-2" style={{ background: zs.hex }} />
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${zs.text}`}>{zone}</span>
            <span className={`text-xs font-mono font-semibold ${zs.text}`}>
              {safetyStatus?.min_distance ?? '---'}<span className="text-[9px] text-slate-500 ml-0.5">mm</span>
            </span>
            <span className={`text-xs ${zs.text} opacity-70 ml-1`}>{speedPct}%</span>
          </div>
        </div>

        {/* Radar — fluid fills full width */}
        <div className="bg-slate-950/50 rounded-xl border border-slate-700/30 overflow-hidden">
          <RobotSensorView tof={tof} thresholds={th} fluid />
        </div>

        {/* Safety toggle */}
        <button onClick={toggleSafety} className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
          safetyEnabled
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
            : 'bg-slate-700/40 text-slate-400 border-slate-600/40 hover:bg-slate-700/60'
        }`}>
          <span className={`w-2 h-2 rounded-full ${safetyEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {safetyEnabled ? 'SAFETY ON' : 'SAFETY OFF'}
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-700/50 mx-3" />

      {/* ── Section 2: IMU — compact horizontal strip ── */}
      <div className="px-3 py-2.5">
        {/* IMU header */}
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">IMU Orientation</span>
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded ml-1">BNO08x</span>
          {/* Calibration dots */}
          <div className="flex items-center gap-1 ml-auto">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="w-2 h-2 rounded-full"
                style={{ background: i < Math.round(acc) ? accColorHex : '#334155' }} />
            ))}
            <span className="text-[10px] font-mono ml-1" style={{ color: accColorHex }}>
              {acc >= 3 ? 'Cal' : acc >= 2 ? 'Good' : acc >= 1 ? 'Fair' : 'Uncal'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Compass */}
          <div className="flex-shrink-0">
            <CompassRose yaw={yaw} size={80} />
          </div>

          {/* Heading */}
          <div className="bg-slate-950/60 rounded-xl px-3 py-2 text-center ring-1 ring-slate-700/40 flex-shrink-0 w-20">
            <p className="text-[8px] uppercase tracking-widest text-slate-500 leading-none mb-0.5">HDG</p>
            <p className="text-xl font-mono font-bold text-cyan-400 leading-none">
              {yaw.toFixed(0)}<span className="text-xs text-cyan-600">°</span>
            </p>
            <p className="text-sm font-bold text-slate-300 mt-0.5">{cardinal}</p>
          </div>

          {/* Pitch / Roll + bars */}
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/60 rounded-lg px-2 py-1.5 text-center ring-1 ring-slate-700/40">
                <p className="text-[8px] text-slate-500 uppercase leading-none mb-0.5">Pitch</p>
                <p className="text-sm font-mono font-bold leading-none" style={{ color: pitchColor }}>
                  {pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°
                </p>
              </div>
              <div className="bg-slate-950/60 rounded-lg px-2 py-1.5 text-center ring-1 ring-slate-700/40">
                <p className="text-[8px] text-slate-500 uppercase leading-none mb-0.5">Roll</p>
                <p className="text-sm font-mono font-bold leading-none" style={{ color: rollColor }}>
                  {roll >= 0 ? '+' : ''}{roll.toFixed(1)}°
                </p>
              </div>
            </div>
            <div className="bg-slate-950/40 rounded-lg p-2 ring-1 ring-slate-700/30 space-y-1.5">
              <AttitudeBar label="Pitch" value={pitch} color="#34d399" />
              <AttitudeBar label="Roll"  value={roll}  color="#a78bfa" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-slate-700/50 mx-3" />

      {/* ── Section 3: Motor Grid ── */}
      <div className="px-3 py-2.5">
        {/* Motor header */}
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-kpatrol-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Motors</span>
          <div className="flex gap-1 ml-2">
            <div className={`w-2 h-2 rounded-full ${isMotorControllerOnline ? 'bg-green-400' : 'bg-red-400'}`} title="ESP32-S3" />
            <div className={`w-2 h-2 rounded-full ${isEncoderReaderOnline ? 'bg-green-400' : 'bg-orange-400'}`} title="Encoder" />
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto ${
            activeMotors > 0 ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/60 text-slate-400'
          }`}>{activeMotors}/4 Active</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {motorList.map(({ id, label }) => {
            const motor    = motors?.[id];
            const encoder  = encoders?.[id];
            const spd      = motor?.speed ?? 0;
            const rpm      = encoder?.rpm ?? 0;
            const dir      = motor?.direction ?? 'stopped';
            const isRunning = dir !== 'stopped' && spd > 0;
            return (
              <div key={id} className={`p-2 rounded-lg transition-all ${
                isRunning ? 'bg-kpatrol-500/15 ring-1 ring-kpatrol-500/30' : 'bg-slate-800/50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{id}</span>
                  <span className="text-[9px] text-slate-500">{label}</span>
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] ${
                    dir === 'forward'  ? 'bg-green-500/20 text-green-400' :
                    dir === 'backward' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {dir === 'forward'  && <ArrowUp    className="w-2.5 h-2.5" />}
                    {dir === 'backward' && <ArrowDown  className="w-2.5 h-2.5" />}
                    {dir === 'stopped'  && <Circle     className="w-2.5 h-2.5" />}
                    {dir === 'forward' ? 'FWD' : dir === 'backward' ? 'BWD' : 'STOP'}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>
                    <span className={`text-sm font-mono font-bold ${isRunning ? 'text-kpatrol-400' : 'text-slate-300'}`}>{spd}</span>
                    <span className="text-[9px] text-slate-500 ml-1">PWM</span>
                  </span>
                  <span>
                    <span className={`text-xs font-mono ${rpm > 0 ? 'text-kpatrol-400' : 'text-slate-400'}`}>{rpm.toFixed(0)}</span>
                    <span className="text-[9px] text-slate-500 ml-1">RPM</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SafetyStatusCard;
