'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRobotStore } from '@/store/robotStore';
import { useMQTT, useRobotControl } from '@/providers/MQTTProvider';
import { useAppMode } from '@/providers/AppModeProvider';
import { cn } from '@/lib/utils';
import { MotorPosition } from '@/lib/mqtt-config';
import { STREAM_CONFIG } from '@/lib/stream-config';
import { 
  StopCircle, 
  RotateCcw, 
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Gauge,
  Navigation,
  Crosshair,
  Wifi,
  Cpu,
  Circle,
  Lightbulb,
  AlertTriangle,
  Sun,
  Activity,
  Video,
  VideoOff,
  X,
  Maximize2,
  Minimize2,
  Shield,
  ShieldOff,
  Radio,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

type ControlMode = 'joystick' | 'dpad';

export function ControlView() {
  const [controlMode, setControlMode] = useState<ControlMode>('joystick');
  const [speedLevel, setSpeedLevel] = useState(60); // Default 60% = ~150/255
  const [showCamera, setShowCamera] = useState(false);
  const [cameraExpanded, setCameraExpanded] = useState(false);
  const { speed, joystickX, joystickY, stopAll } = useRobotStore();
  const { isConnected, isRobotOnline, isMotorControllerOnline, isEncoderReaderOnline, safetyEnabled, toggleSafety, sendNavCommand, navStatus, safetyStatus } = useMQTT();
  const robotControl = useRobotControl();
  const { isDev } = useAppMode();
  const [navMode, setNavMode] = useState<string>(navStatus?.mode ?? 'MANUAL');
  
  // Convert speed level (0-100) to motor speed (0-255)
  const motorSpeed = Math.round((speedLevel / 100) * 255);
  
  // Update MQTT speed when slider changes
  useEffect(() => {
    robotControl.setSpeed(motorSpeed);
  }, [motorSpeed]);
  
  // Handle emergency stop
  const handleEmergencyStop = useCallback(() => {
    robotControl.emergencyStop();
    stopAll();
    setNavMode('MANUAL');
  }, [robotControl, stopAll]);

  // Handle nav mode change
  const handleNavMode = useCallback((mode: string) => {
    setNavMode(mode);
    sendNavCommand(mode, { speed: speedLevel });
  }, [sendNavCommand, speedLevel]);

  // Sync navMode from robot status
  useEffect(() => {
    if (navStatus?.mode) setNavMode(navStatus.mode);
  }, [navStatus?.mode]);

  const navActive = navMode !== 'MANUAL';

  return (
    <div className="h-full flex flex-col gap-2 md:gap-3 min-h-0">
      {/* ──────────── COCKPIT HEADER ──────────── */}
      <CockpitHeader
        isDev={isDev}
        isConnected={isConnected}
        isRobotOnline={isRobotOnline}
        isMotorControllerOnline={isMotorControllerOnline}
        isEncoderReaderOnline={isEncoderReaderOnline}
        controlMode={controlMode}
        motorSpeed={motorSpeed}
        safetyStatus={safetyStatus}
        onEStop={handleEmergencyStop}
      />

      {/* Camera Panel — top position when toggled */}
      {showCamera && (
        <CameraPanel
          expanded={cameraExpanded}
          onToggleExpand={() => setCameraExpanded(!cameraExpanded)}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Auto-nav active banner */}
      {navActive && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-kpatrol-500/15 via-cyan-500/10 to-transparent ring-1 ring-kpatrol-500/30">
          <Navigation className="w-3.5 h-3.5 text-kpatrol-300 animate-pulse" />
          <span className="text-xs font-semibold text-kpatrol-200">
            {navMode === 'SCRIPT_PATROL' ? 'Đang tuần tra theo kịch bản' : navMode === 'EMERGENCY' ? 'Dừng khẩn cấp' : navMode}
          </span>
          {navStatus?.step_progress !== undefined && (
            <span className="text-[10px] text-kpatrol-300 font-mono ml-auto">
              {Math.round(navStatus.step_progress * 100)}%
            </span>
          )}
          <button
            onClick={() => handleNavMode('MANUAL')}
            className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-black rounded-md ring-1 ring-red-500/40 hover:bg-red-500/30"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ──────────── MAIN GRID: Power Ring | Side Rail ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(400px,1fr)] gap-3 md:gap-4 flex-1 min-h-0">

        {/* ── LEFT: Cockpit center stage ── */}
        <div className="flex flex-col gap-3 min-h-0">
          <PowerRingControl
            controlMode={controlMode}
            onModeChange={setControlMode}
            speedLevel={speedLevel}
            onSpeedChange={setSpeedLevel}
            joystickX={joystickX}
            joystickY={joystickY}
            speed={speed}
          />
          <MotorStrip />
        </div>

        {/* ── RIGHT: HUD rail — balanced with flex-1 distribution ── */}
        <div className="flex flex-col gap-3 min-h-0">
          <AttitudeHUD />
          <DirectionalSafetyMini />
          <ActionsRail
            navMode={navMode}
            onNavMode={handleNavMode}
            lightState={robotControl.lightState}
            mainLightState={robotControl.mainLightState}
            toggleLight={robotControl.toggleLight}
            toggleMainLight={robotControl.toggleMainLight}
            showCamera={showCamera}
            onToggleCamera={() => setShowCamera(!showCamera)}
            safetyEnabled={safetyEnabled}
            onToggleSafety={toggleSafety}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COCKPIT REDESIGN COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── CockpitHeader: status pulse + dev badges + safety zone + ESTOP ──
function CockpitHeader({
  isDev, isConnected, isRobotOnline,
  isMotorControllerOnline, isEncoderReaderOnline,
  controlMode, motorSpeed, safetyStatus, onEStop,
}: {
  isDev: boolean;
  isConnected: boolean;
  isRobotOnline: boolean;
  isMotorControllerOnline: boolean;
  isEncoderReaderOnline: boolean;
  controlMode: ControlMode;
  motorSpeed: number;
  safetyStatus: ReturnType<typeof useMQTT>['safetyStatus'];
  onEStop: () => void;
}) {
  const isDanger = safetyStatus?.zone === 'danger';
  const zonePalette = {
    safe:    { bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'ring-emerald-500/40' },
    slow:    { bg: 'bg-yellow-500/15',  text: 'text-yellow-300',  ring: 'ring-yellow-500/40' },
    caution: { bg: 'bg-orange-500/15',  text: 'text-orange-300',  ring: 'ring-orange-500/40' },
    danger:  { bg: 'bg-red-500/20',     text: 'text-red-300',     ring: 'ring-red-500/40' },
  };
  const zoneStyle = safetyStatus ? zonePalette[safetyStatus.zone] : zonePalette.safe;

  return (
    <div className="relative shrink-0 rounded-2xl border border-slate-700/40 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-md overflow-hidden shadow-lg">
      {/* Top scanline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Identity + status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="p-2 bg-gradient-to-br from-kpatrol-500/30 to-kpatrol-700/10 rounded-xl ring-1 ring-kpatrol-500/40">
              <Gamepad2 className="w-5 h-5 text-kpatrol-300" />
            </div>
            <span className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900',
              isRobotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
            )} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-black text-white tracking-wider leading-tight uppercase">Cockpit</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
              {controlMode === 'joystick' ? 'Joystick mode' : 'D-Pad mode'}
              <span className="mx-1 text-slate-600">·</span>
              <span className={cn('font-bold', isRobotOnline ? 'text-emerald-400' : 'text-red-400')}>
                {isRobotOnline ? 'Online' : 'Offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Dev badges */}
        {isDev && (
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'MQTT', on: isConnected, icon: <Wifi className="w-3 h-3" /> },
              { label: 'S3',   on: isMotorControllerOnline, icon: <Cpu className="w-3 h-3" /> },
              { label: 'Enc',  on: isEncoderReaderOnline,   icon: <Circle className="w-3 h-3" /> },
            ].map((b) => (
              <div key={b.label} className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ring-1',
                b.on ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'bg-red-500/15 text-red-300 ring-red-500/30'
              )}>
                {b.icon}
                {b.label}
              </div>
            ))}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30 ml-1">
              PWM {motorSpeed}/255
            </span>
          </div>
        )}

        {/* Right: Safety zone + ESTOP */}
        <div className="flex items-center gap-2 shrink-0">
          {safetyStatus && (
            <div className={cn(
              'hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ring-1',
              zoneStyle.bg, zoneStyle.text, zoneStyle.ring,
              isDanger && 'animate-pulse'
            )}>
              <Shield className="w-3 h-3" />
              <span>{safetyStatus.zone}</span>
              <span className="font-mono opacity-70">{safetyStatus.min_distance}mm</span>
            </div>
          )}

          <button
            onClick={onEStop}
            className="group relative flex items-center gap-1.5 px-3 md:px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:scale-95 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_16px_rgba(239,68,68,0.4)] ring-1 ring-red-400/50"
          >
            <span className="absolute inset-0 rounded-xl bg-red-400/20 group-hover:animate-ping" />
            <StopCircle className="relative w-4 h-4" />
            <span className="relative">E-Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PowerRingControl: joystick wrapped in animated speed-arc ring ──
function PowerRingControl({
  controlMode, onModeChange, speedLevel, onSpeedChange,
  joystickX, joystickY, speed,
}: {
  controlMode: ControlMode;
  onModeChange: (m: ControlMode) => void;
  speedLevel: number;
  onSpeedChange: (n: number) => void;
  joystickX: number;
  joystickY: number;
  speed: number;
}) {
  const intensity = Math.min(1, Math.hypot(joystickX, joystickY));

  // Speed arc geometry: full track 270° starting from -225° (bottom-left)
  // Rotating coords so 0% = bottom-left, 100% = bottom-right
  const RAD = 95;
  const ARC_DEG = 270;
  const arcLen = 2 * Math.PI * RAD;
  const trackDash = (ARC_DEG / 360) * arcLen;
  const speedDash = (speedLevel / 100) * trackDash;

  return (
    <div className="relative flex-1 min-h-0 rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-kpatrol-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
      {/* Ambient glow — pulses with joystick intensity */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, rgba(34,211,238,${0.05 + intensity * 0.20}) 0%, transparent 60%)`,
        }}
      />
      {/* Top scanline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      {/* Floating mode toggle — segmented pill top-right */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-0.5 p-1 md:p-1.5 bg-slate-950/80 backdrop-blur-md rounded-full ring-1 ring-slate-700/60 shadow-xl">
        <button
          onClick={() => onModeChange('joystick')}
          className={cn(
            'flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all',
            controlMode === 'joystick'
              ? 'bg-gradient-to-r from-kpatrol-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <Crosshair className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Joy
        </button>
        <button
          onClick={() => onModeChange('dpad')}
          className={cn(
            'flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all',
            controlMode === 'dpad'
              ? 'bg-gradient-to-r from-kpatrol-500 to-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]'
              : 'text-slate-400 hover:text-white'
          )}
        >
          <Gamepad2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Pad
        </button>
      </div>

      {/* Top-left badge: speed % readout */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex flex-col items-start">
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-slate-500 leading-none">Speed</span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-4xl md:text-5xl font-black text-cyan-300 leading-none tabular-nums">
            {speedLevel}
          </span>
          <span className="text-base md:text-lg font-bold text-cyan-600">%</span>
        </div>
      </div>

      {/* Center stage — joystick floats inside power-ring SVG */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 px-6 md:px-10 py-8 md:py-10">
        <svg
          className="absolute pointer-events-none w-[min(100%,420px)] h-[min(100%,420px)] md:w-[min(100%,480px)] md:h-[min(100%,480px)]"
          viewBox="0 0 200 200"
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.35))', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="speedArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>

          {/* Track arc */}
          <circle
            cx="100" cy="100" r={RAD}
            fill="none"
            stroke="rgba(100,116,139,0.18)"
            strokeWidth="3"
            strokeDasharray={`${trackDash} ${arcLen}`}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
          />
          {/* Active speed arc */}
          <circle
            cx="100" cy="100" r={RAD}
            fill="none"
            stroke="url(#speedArcGrad)"
            strokeWidth="4"
            strokeDasharray={`${speedDash} ${arcLen}`}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.7))', transition: 'stroke-dasharray 0.2s' }}
          />

          {/* Tick marks at 0/25/50/75/100 */}
          {[0, 25, 50, 75, 100].map((t) => {
            const angle = 135 + (t / 100) * ARC_DEG;
            const rad = (angle * Math.PI) / 180;
            const inner = 88;
            const outer = 100;
            return (
              <line
                key={t}
                x1={100 + Math.cos(rad) * inner}
                y1={100 + Math.sin(rad) * inner}
                x2={100 + Math.cos(rad) * outer}
                y2={100 + Math.sin(rad) * outer}
                stroke={t <= speedLevel ? '#22d3ee' : '#475569'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Inner intensity pulse — only when joystick is active */}
          {intensity > 0.05 && (
            <circle
              cx="100" cy="100" r="78"
              fill="none"
              stroke="url(#speedArcGrad)"
              strokeWidth="1.5"
              opacity={0.3 + intensity * 0.5}
              style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.7))' }}
            />
          )}
        </svg>

        {/* Joystick — centered inside power-ring */}
        <div className="relative z-10">
          {controlMode === 'joystick' ? <Joystick /> : <DPad />}
        </div>

        {/* Side rotation buttons (LARGE) — pushed outward + dropped low for thumb reach */}
        <LargeRotationBtn
          dir="left"
          className="absolute left-1 sm:left-3 md:left-6 bottom-[14%] md:bottom-[16%] z-20"
        />
        <LargeRotationBtn
          dir="right"
          className="absolute right-1 sm:right-3 md:right-6 bottom-[14%] md:bottom-[16%] z-20"
        />
      </div>

      {/* Bottom panel: speed slider + telemetry */}
      <div className="relative shrink-0 px-3 md:px-5 pb-3 md:pb-4 pt-2 md:pt-3 space-y-3 md:space-y-3.5 border-t border-slate-700/30 bg-slate-950/40">
        {/* Speed scrubber */}
        <div className="flex items-center gap-2.5 md:gap-3">
          <Gauge className="w-5 h-5 md:w-6 md:h-6 text-cyan-400 shrink-0" />
          <input
            type="range"
            min={10} max={100} step={10}
            value={speedLevel}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="flex-1 h-2.5 md:h-3 bg-slate-800 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
              md:[&::-webkit-slider-thumb]:w-7 md:[&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-400
              [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(34,211,238,0.7)]
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        {/* Telemetry mini pills */}
        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
          <div className="flex-1 flex items-center justify-between gap-1 px-3 py-2 md:py-2.5 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/40">
            <span className="text-slate-500 font-bold">X</span>
            <span className="font-mono text-slate-300 tabular-nums">{joystickX.toFixed(2)}</span>
          </div>
          <div className="flex-1 flex items-center justify-between gap-1 px-3 py-2 md:py-2.5 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/40">
            <span className="text-slate-500 font-bold">Y</span>
            <span className="font-mono text-slate-300 tabular-nums">{joystickY.toFixed(2)}</span>
          </div>
          <div className="flex-1 flex items-center justify-between gap-1 px-3 py-2 md:py-2.5 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
            <span className="font-mono text-cyan-300 font-bold tabular-nums">{speed.toFixed(1)}</span>
            <span className="text-cyan-500/80 font-bold">m/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LargeRotationBtn: big thumb-friendly rotation button placed beside the joystick ──
function LargeRotationBtn({ dir, className }: { dir: 'left' | 'right'; className?: string }) {
  const robotControl = useRobotControl();
  const [active, setActive] = useState(false);

  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    if (dir === 'left') robotControl.rotateLeft();
    else robotControl.rotateRight();
  };
  const end = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setActive(false);
    robotControl.stop();
  };

  const Icon = dir === 'left' ? RotateCcw : RotateCw;
  const label = dir === 'left' ? 'Quay trái' : 'Quay phải';

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={(e) => { if (active) end(e); }}
      className={cn(
        'shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl ring-1 flex items-center justify-center select-none touch-none transition-all duration-150 active:scale-95',
        active
          ? 'bg-gradient-to-br from-cyan-400/40 to-blue-600/40 ring-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.7)] text-white'
          : 'bg-slate-900/70 ring-cyan-500/30 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.22)] hover:ring-cyan-400/60 hover:text-white',
        className
      )}
    >
      <Icon className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.25} />
    </button>
  );
}

// ── AttitudeHUD: artificial horizon (pitch + roll) + heading band ──
function AttitudeHUD() {
  const { imuData } = useMQTT();
  const { isDev } = useAppMode();
  const yaw   = imuData?.yaw   ?? 0;
  const pitch = imuData?.pitch ?? 0;
  const roll  = imuData?.roll  ?? 0;
  const acc   = imuData?.accuracy ?? 0;

  const cardinals = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  const cardinalIdx = ((Math.round(yaw / 45) % 8) + 8) % 8;
  const cardinal = cardinals[cardinalIdx] ?? 'Bắc';

  const tilt = Math.max(Math.abs(pitch), Math.abs(roll));
  const status = tilt < 5
    ? { label: 'Cân bằng',     color: '#34d399', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' }
    : tilt < 15
    ? { label: 'Hơi nghiêng',  color: '#fbbf24', bg: 'bg-yellow-500/10',  ring: 'ring-yellow-500/30' }
    : tilt < 25
    ? { label: 'Nghiêng',      color: '#fb923c', bg: 'bg-orange-500/10',  ring: 'ring-orange-500/30' }
    : { label: 'Nghiêng mạnh', color: '#f87171', bg: 'bg-red-500/15',     ring: 'ring-red-500/40' };

  // Pitch translates 1° = 1.6px, roll rotates the whole horizon
  const pitchPx = Math.max(-60, Math.min(60, pitch * 1.6));
  const rollDeg = Math.max(-60, Math.min(60, roll));
  const accColor = acc >= 3 ? '#34d399' : acc >= 2 ? '#fbbf24' : acc >= 1 ? '#fb923c' : '#64748b';

  return (
    <div className="flex-1 min-h-[220px] rounded-2xl bg-slate-950/70 backdrop-blur-sm border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
      {/* Header band */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/60">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hướng</span>
        <div className="flex items-baseline gap-2">
          <span className="text-base md:text-lg font-black text-cyan-300 tracking-wide">{cardinal}</span>
          {isDev && (
            <span className="text-[10px] font-mono text-cyan-600 tabular-nums">{yaw.toFixed(0)}°</span>
          )}
        </div>
        <div className="flex items-center gap-1" title={`Hiệu chuẩn ${acc}/3`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="w-2 h-2 rounded-full"
              style={{ background: i < Math.round(acc) ? accColor : '#334155' }} />
          ))}
        </div>
      </div>

      {/* Artificial horizon — sky over ground, rotates with roll, translates with pitch */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-sky-900 to-amber-950">
        <div
          className="absolute inset-[-50%] transition-transform duration-100"
          style={{ transform: `rotate(${rollDeg}deg) translateY(${pitchPx}px)` }}
        >
          {/* Sky — top half */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-sky-500 via-sky-700 to-sky-900" />
          {/* Ground — bottom half */}
          <div className="absolute top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-amber-700 via-amber-900 to-stone-950" />
          {/* Horizon line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          {/* Pitch ladder lines */}
          {[-20, -10, 10, 20].map((p) => (
            <div
              key={p}
              className="absolute left-1/2 -translate-x-1/2 h-px"
              style={{
                top: `calc(50% + ${-p * 1.6 * 1.4}px)`,
                width: Math.abs(p) === 10 ? '50%' : '35%',
                background: 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </div>

        {/* Fixed crosshair (aircraft symbol) — bigger */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          <div className="w-9 h-[4px] bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.9)]" />
          <div className="w-2 h-2 rounded-full bg-yellow-400 mx-1 shadow-[0_0_5px_rgba(250,204,21,0.9)]" />
          <div className="w-9 h-[4px] bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.9)]" />
        </div>

        {/* Roll indicator triangle (top center, fixed) */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] border-t-yellow-400 drop-shadow-md" />
        </div>

        {/* Roll degree band ticks */}
        <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none">
          {[-45, -30, -15, 0, 15, 30, 45].map((t) => (
            <div
              key={t}
              className="absolute top-1.5 w-px bg-white/50"
              style={{
                left: `${50 + (t / 45) * 38}%`,
                height: t === 0 ? '10px' : '5px',
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer status — taller, more readable */}
      <div className={cn(
        'shrink-0 flex items-center justify-between px-3 py-2 ring-1', status.bg, status.ring
      )}>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Cân bằng</span>
        <span className="text-sm font-black tracking-wide" style={{ color: status.color }}>
          {status.label}
        </span>
        {isDev ? (
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
            P{pitch >= 0 ? '+' : ''}{pitch.toFixed(0)}°
            <span className="mx-0.5">·</span>
            R{roll >= 0 ? '+' : ''}{roll.toFixed(0)}°
          </span>
        ) : (
          <span className="w-16" />
        )}
      </div>
    </div>
  );
}

// ── DirectionalSafetyMini: 6-direction radar (compact) ──
function DirectionalSafetyMini() {
  const { safetyStatus, safetyEnabled } = useMQTT();
  const dirs = safetyStatus?.directions;
  const minDist = safetyStatus?.min_distance ?? 0;
  const zone = safetyStatus?.zone ?? 'safe';
  const zoneHex = zone === 'danger' ? '#f87171' : zone === 'caution' ? '#fb923c' : zone === 'slow' ? '#fbbf24' : '#34d399';

  // 6 directions with their angles (deg, 0=up, clockwise)
  const beams: { key: 'forward' | 'forwardLeft' | 'forwardRight' | 'left' | 'right' | 'backward'; angle: number; label: string }[] = [
    { key: 'forward',      angle:    0, label: 'Trước' },
    { key: 'forwardLeft',  angle: -45,  label: 'Trước-Trái' },
    { key: 'forwardRight', angle:  45,  label: 'Trước-Phải' },
    { key: 'left',         angle: -90,  label: 'Trái' },
    { key: 'right',        angle:  90,  label: 'Phải' },
    { key: 'backward',     angle: 180,  label: 'Sau' },
  ];

  return (
    <div className="flex-1 min-h-[220px] rounded-2xl bg-slate-950/70 backdrop-blur-sm border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Cảm biến an toàn</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: zoneHex }}>{zone}</span>
          <span className="text-[10px] font-mono text-slate-300 tabular-nums px-1.5 py-0.5 rounded bg-slate-800/60">{minDist}mm</span>
        </div>
      </div>

      {/* Radar SVG */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 py-2">
        <svg viewBox="0 0 160 140" className="w-full h-full max-h-[260px]" preserveAspectRatio="xMidYMid meet">
          {/* Concentric guide rings — extended */}
          {[20, 40, 60].map((r) => (
            <circle key={r} cx="80" cy="70" r={r} fill="none" stroke="rgba(100,116,139,0.22)" strokeWidth="0.6" strokeDasharray={r === 60 ? '0' : '2 3'} />
          ))}
          {/* Crosshair */}
          <line x1="80" y1="6" x2="80" y2="134" stroke="rgba(100,116,139,0.22)" strokeWidth="0.5" />
          <line x1="14" y1="70" x2="146" y2="70" stroke="rgba(100,116,139,0.22)" strokeWidth="0.5" />

          {/* Sweep gradient (subtle) */}
          <defs>
            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.10)" />
              <stop offset="70%" stopColor="rgba(34,211,238,0.02)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
          </defs>
          <circle cx="80" cy="70" r="60" fill="url(#radarSweep)" />

          {/* Robot center — bigger, more prominent */}
          <rect x="70" y="60" width="20" height="24" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.8" />
          <circle cx="80" cy="66" r="2.5" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 3px #22d3ee)' }} />
          <line x1="80" y1="60" x2="80" y2="56" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />

          {/* Beams */}
          {beams.map((b) => {
            const beam = dirs?.[b.key as keyof typeof dirs];
            const distance = beam?.distance ?? 0;
            const blocked = beam?.blocked ?? false;
            const beamZone = beam?.zone ?? 'safe';
            const color = blocked ? '#f87171'
              : beamZone === 'danger' ? '#f87171'
              : beamZone === 'caution' ? '#fb923c'
              : beamZone === 'slow' ? '#fbbf24'
              : '#34d399';
            // Distance: 0-1000mm maps to 8-58px guide length (longer beams)
            const guideLen = Math.max(10, Math.min(58, (distance / 1000) * 58));
            const rad = ((b.angle - 90) * Math.PI) / 180;
            const ox = 80 + Math.cos(rad) * 14;
            const oy = 70 + Math.sin(rad) * 14;
            const tx = 80 + Math.cos(rad) * (14 + guideLen);
            const ty = 70 + Math.sin(rad) * (14 + guideLen);
            return (
              <g key={b.key}>
                <line
                  x1={ox} y1={oy} x2={tx} y2={ty}
                  stroke={color} strokeWidth={blocked ? 3 : 2.2}
                  opacity={safetyEnabled ? 0.95 : 0.35}
                  strokeLinecap="round"
                />
                <circle cx={tx} cy={ty} r={blocked ? 3.5 : 2.5} fill={color}
                  opacity={safetyEnabled ? 1 : 0.4}
                  style={{ filter: blocked ? `drop-shadow(0 0 5px ${color})` : `drop-shadow(0 0 2px ${color})` }}
                />
              </g>
            );
          })}
        </svg>

        {/* Disabled overlay */}
        {!safetyEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 px-2 py-0.5 rounded-md bg-red-500/15 ring-1 ring-red-500/40">
              Safety OFF
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ActionsRail: compact FAB row for quick actions ──
function ActionsRail({
  navMode, onNavMode,
  lightState, mainLightState, toggleLight, toggleMainLight,
  showCamera, onToggleCamera,
  safetyEnabled, onToggleSafety,
}: {
  navMode: string;
  onNavMode: (m: string) => void;
  lightState: boolean;
  mainLightState: boolean;
  toggleLight: () => void;
  toggleMainLight: () => void;
  showCamera: boolean;
  onToggleCamera: () => void;
  safetyEnabled: boolean;
  onToggleSafety: () => void;
}) {
  type Btn = {
    key: string;
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
    activeColor: string;
    activeBg: string;
  };
  const buttons: Btn[] = [
    {
      key: 'patrol',
      label: 'Tuần tra',
      icon: <Navigation className="w-5 h-5" />,
      active: navMode === 'SCRIPT_PATROL',
      onClick: () => onNavMode(navMode === 'SCRIPT_PATROL' ? 'MANUAL' : 'SCRIPT_PATROL'),
      activeColor: 'text-cyan-300',
      activeBg: 'bg-gradient-to-br from-cyan-500/30 to-kpatrol-500/20 ring-cyan-500/50 shadow-[0_0_14px_rgba(34,211,238,0.45)]',
    },
    {
      key: 'warning',
      label: 'Cảnh báo',
      icon: <AlertTriangle className="w-5 h-5" />,
      active: lightState,
      onClick: toggleLight,
      activeColor: 'text-yellow-300',
      activeBg: 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20 ring-yellow-500/50 shadow-[0_0_14px_rgba(250,204,21,0.45)]',
    },
    {
      key: 'light',
      label: mainLightState ? 'Đèn ON' : 'Đèn',
      icon: mainLightState ? <Sun className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />,
      active: mainLightState,
      onClick: toggleMainLight,
      activeColor: 'text-amber-300',
      activeBg: 'bg-gradient-to-br from-amber-500/30 to-yellow-500/20 ring-amber-500/50 shadow-[0_0_14px_rgba(251,191,36,0.45)]',
    },
    {
      key: 'camera',
      label: 'Camera',
      icon: showCamera ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />,
      active: showCamera,
      onClick: onToggleCamera,
      activeColor: 'text-emerald-300',
      activeBg: 'bg-gradient-to-br from-emerald-500/30 to-green-500/20 ring-emerald-500/50 shadow-[0_0_14px_rgba(52,211,153,0.45)]',
    },
    {
      key: 'safety',
      label: safetyEnabled ? 'An toàn' : 'Tắt AT',
      icon: safetyEnabled ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />,
      active: safetyEnabled,
      onClick: onToggleSafety,
      activeColor: safetyEnabled ? 'text-emerald-300' : 'text-red-300',
      activeBg: safetyEnabled
        ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 ring-emerald-500/50 shadow-[0_0_14px_rgba(52,211,153,0.45)]'
        : 'bg-gradient-to-br from-red-500/30 to-red-600/20 ring-red-500/50 shadow-[0_0_14px_rgba(248,113,113,0.45)]',
    },
  ];

  return (
    <div className="shrink-0 rounded-2xl bg-slate-950/70 backdrop-blur-sm border border-slate-700/50 shadow-xl p-2.5">
      <div className="grid grid-cols-5 gap-2">
        {buttons.map((b) => (
          <button
            key={b.key}
            onClick={b.onClick}
            className={cn(
              'group relative flex flex-col items-center justify-center gap-1 py-3 md:py-3.5 rounded-xl ring-1 transition-all active:scale-95',
              b.active
                ? cn(b.activeBg, b.activeColor)
                : 'bg-slate-900/60 ring-slate-700/40 text-slate-400 hover:text-white hover:ring-slate-500/60'
            )}
          >
            <span className={cn('transition-transform group-active:scale-90', b.active && 'drop-shadow-md')}>
              {b.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-full">
              {b.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MotorStrip: compact 4-motor horizontal status display ──
function MotorStrip() {
  const { motors, encoders, isMotorControllerOnline, isEncoderReaderOnline } = useMQTT();
  const { isDev } = useAppMode();

  const items: { id: MotorPosition; label: string }[] = [
    { id: 'FL', label: 'TT' },
    { id: 'FR', label: 'TP' },
    { id: 'BL', label: 'ST' },
    { id: 'BR', label: 'SP' },
  ];

  const activeCount = motors ? items.filter((it) => {
    const m = motors[it.id];
    return m && m.direction !== 'stopped' && (m.speed ?? 0) > 0;
  }).length : 0;

  return (
    <div className="shrink-0 rounded-2xl bg-slate-950/70 backdrop-blur-sm border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Motor</span>
          {isDev && (
            <div className="flex gap-1 ml-0.5">
              <div className={cn('w-2 h-2 rounded-full', isMotorControllerOnline ? 'bg-emerald-400' : 'bg-red-400')} title="Motor controller" />
              <div className={cn('w-2 h-2 rounded-full', isEncoderReaderOnline ? 'bg-emerald-400' : 'bg-orange-400')} title="Encoder reader" />
            </div>
          )}
        </div>
        <span className={cn(
          'text-[11px] font-black px-2 py-0.5 rounded-md ring-1',
          activeCount > 0 ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'bg-slate-800 text-slate-500 ring-slate-700/40'
        )}>
          {activeCount}/4 ACT
        </span>
      </div>

      {/* 4 motor cells in a strip */}
      <div className="grid grid-cols-4 divide-x divide-slate-700/30">
        {items.map((it) => {
          const m = motors?.[it.id];
          const e = encoders?.[it.id];
          const speed = m?.speed ?? 0;
          const rpm = e?.rpm ?? 0;
          const dir = m?.direction ?? 'stopped';
          const running = dir !== 'stopped' && speed > 0;
          const speedPct = (speed / 255) * 100;
          const dirIcon = dir === 'forward' ? <ArrowUp className="w-3 h-3" />
            : dir === 'backward' ? <ArrowDown className="w-3 h-3" />
            : <Circle className="w-3 h-3" />;
          const dirColor = dir === 'forward' ? 'text-emerald-400'
            : dir === 'backward' ? 'text-orange-400'
            : 'text-slate-500';
          return (
            <div key={it.id} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-black', running ? 'text-cyan-300' : 'text-slate-400')}>
                    {it.id}
                  </span>
                  <span className="text-[10px] text-slate-500">{it.label}</span>
                </div>
                <span className={cn('flex items-center', dirColor)} title={dir}>
                  {dirIcon}
                </span>
              </div>
              {/* Speed bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-150 rounded-full',
                    running ? 'bg-gradient-to-r from-cyan-500 to-kpatrol-400' : 'bg-slate-700'
                  )}
                  style={{ width: `${speedPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                <span className={running ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                  {speed}
                </span>
                <span className={rpm > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                  {rpm.toFixed(0)} RPM
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Joystick() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const { setJoystick } = useRobotStore();
  const robotControl = useRobotControl();
  const lastCommandRef = useRef<string>('');

  // rAF throttle refs — coalesce many pointermove events into one frame update
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const maxRadius = 95;

  // Determine movement command based on joystick position
  // Uses ESP32-S3 serial protocol commands
  const getCommandFromPosition = useCallback((x: number, y: number): string | null => {
    const threshold = 0.3;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX < threshold && absY < threshold) return 'S'; // Stop

    // Determine primary direction
    if (absY > absX) {
      return y > 0 ? 'F' : 'B'; // Forward / Backward
    } else {
      return x > 0 ? 'SR' : 'SL'; // Strafe Right / Strafe Left
    }
  }, []);

  // Send command via MQTT (using ESP32-S3 protocol)
  const sendMQTTCommand = useCallback((x: number, y: number) => {
    const command = getCommandFromPosition(x, y);
    if (!command || command === lastCommandRef.current) return;

    lastCommandRef.current = command;

    switch (command) {
      case 'F':  robotControl.forward();      break;
      case 'B':  robotControl.backward();     break;
      case 'SL': robotControl.strafeLeft();   break;
      case 'SR': robotControl.strafeRight();  break;
      case 'S':  robotControl.stop();         break;
    }
  }, [robotControl, getCommandFromPosition]);

  // Compute clamped position from raw client coords
  const computePos = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    return { x: dx, y: dy };
  }, [maxRadius]);

  // Schedule an rAF flush — collapses many move events into one paint
  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingPosRef.current;
      if (!p) return;
      pendingPosRef.current = null;
      setPosition(p);
      const nx = p.x / maxRadius;
      const ny = -p.y / maxRadius;
      setJoystick(nx, ny);
      sendMQTTCommand(nx, ny);
    });
  }, [maxRadius, setJoystick, sendMQTTCommand]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    pendingPosRef.current = computePos(e.clientX, e.clientY);
    scheduleFlush();
  }, [computePos, scheduleFlush]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    pendingPosRef.current = computePos(e.clientX, e.clientY);
    scheduleFlush();
  }, [computePos, scheduleFlush]);

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPosRef.current = null;
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    setJoystick(0, 0);
    robotControl.stop();
    lastCommandRef.current = 'stop';
  }, [setJoystick, robotControl]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const distance = Math.hypot(position.x, position.y);
  const intensity = (distance / maxRadius) * 100;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="joystick-base relative flex items-center justify-center touch-none select-none cursor-pointer ring-1 ring-cyan-500/25 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {/* Outer dashed ring (HUD reticle) */}
        <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/30" />

        {/* Cross guides */}
        <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
          <div className="w-px h-full bg-cyan-400/15" />
        </div>
        <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-cyan-400/15" />
        </div>

        {/* Direction indicators (lucide arrows for crisp HUD look) */}
        <ArrowUp className="absolute top-3 left-1/2 -translate-x-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400/60" strokeWidth={1.5} />
        <ArrowDown className="absolute bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400/60" strokeWidth={1.5} />
        <ArrowLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400/60" strokeWidth={1.5} />
        <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400/60" strokeWidth={1.5} />

        {/* Handle — GPU-accelerated transform; instant follow when dragging, spring back on release */}
        <div
          className={cn(
            'joystick-handle',
            isDragging && 'active'
          )}
          style={{
            top: '50%',
            left: '50%',
            transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) ${isDragging ? 'scale(1.08)' : 'scale(1)'}`,
            transition: isDragging
              ? 'box-shadow 120ms linear'
              : 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease-out',
            willChange: 'transform',
          }}
        >
          <Crosshair className="w-9 h-9 md:w-11 md:h-11 text-white/90" />
        </div>
      </div>

      {/* Intensity indicator — absolutely positioned below joystick so it doesn't affect joystick centering */}
      <div className="absolute top-full inset-x-0 mt-12 md:mt-16 flex items-center gap-2 pointer-events-none">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Cường độ:</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-800/80 ring-1 ring-slate-700/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.7)] transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, intensity))}%` }}
          />
        </div>
        <span className="text-xs font-mono font-black text-cyan-300 tabular-nums w-10 text-right">{intensity.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function DPad() {
  const { setJoystick } = useRobotStore();
  const robotControl = useRobotControl();
  const { safetyStatus, safetyEnabled } = useMQTT();
  const [activeDirection, setActiveDirection] = useState<string | null>(null);

  // V5: Check if a DPad direction is blocked by directional safety
  const isBlocked = (direction: string): boolean => {
    if (!safetyEnabled || !safetyStatus?.directions) return false;
    const dirs = safetyStatus.directions;
    switch (direction) {
      case 'up':       return dirs.forward?.blocked ?? false;
      case 'down':     return dirs.backward?.blocked ?? false;
      case 'left':     return dirs.left?.blocked ?? false;
      case 'right':    return dirs.right?.blocked ?? false;
      case 'up-left':  return (dirs.forward?.blocked ?? false) || (dirs.left?.blocked ?? false);
      case 'up-right': return (dirs.forward?.blocked ?? false) || (dirs.right?.blocked ?? false);
      case 'down-left': return dirs.backward?.blocked ?? false;
      case 'down-right': return dirs.backward?.blocked ?? false;
      default: return false;
    }
  };

  const handlePress = (direction: string, x: number, y: number) => {
    // Don't send command if direction is blocked
    if (isBlocked(direction)) return;

    setActiveDirection(direction);
    setJoystick(x, y);

    // Send MQTT command based on direction (ESP32-S3 protocol)
    switch (direction) {
      case 'up':
        robotControl.forward();       // F
        break;
      case 'down':
        robotControl.backward();      // B
        break;
      case 'left':
        robotControl.strafeLeft();    // SL
        break;
      case 'right':
        robotControl.strafeRight();   // SR
        break;
      case 'up-left':
        robotControl.diagonalLeft();  // DL
        break;
      case 'up-right':
        robotControl.diagonalRight(); // DR
        break;
      case 'down-left':
        // Diagonal back-left (reverse of DR)
        robotControl.backward();
        break;
      case 'down-right':
        // Diagonal back-right (reverse of DL)
        robotControl.backward();
        break;
    }
  };

  const handleRelease = () => {
    setActiveDirection(null);
    setJoystick(0, 0);
    robotControl.stop();
  };

  const DirectionBtn = ({
    direction,
    x,
    y,
    icon,
    className
  }: {
    direction: string;
    x: number;
    y: number;
    icon: React.ReactNode;
    className?: string;
  }) => {
    const blocked = isBlocked(direction);
    return (
      <button
        onMouseDown={() => handlePress(direction, x, y)}
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        onTouchStart={() => handlePress(direction, x, y)}
        onTouchEnd={handleRelease}
        disabled={blocked}
        className={cn(
          'w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 flex items-center justify-center transition-all',
          blocked
            ? 'bg-red-500/10 border-red-500/40 cursor-not-allowed opacity-60'
            : 'bg-dark-surface border-dark-border hover:border-kpatrol-500/50 active:bg-kpatrol-500/20 active:border-kpatrol-500',
          !blocked && activeDirection === direction && 'bg-kpatrol-500/20 border-kpatrol-500 shadow-glow-sm',
          className
        )}
      >
        {blocked ? (
          <span className="text-red-400 text-xs font-bold">✕</span>
        ) : icon}
      </button>
    );
  };

  return (
    <div className="relative w-60 h-60 md:w-72 md:h-72">
      {/* Up */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <DirectionBtn direction="up" x={0} y={1} icon={<ArrowUp className="w-8 h-8 md:w-9 md:h-9 text-kpatrol-400" />} />
      </div>

      {/* Down */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <DirectionBtn direction="down" x={0} y={-1} icon={<ArrowDown className="w-8 h-8 md:w-9 md:h-9 text-kpatrol-400" />} />
      </div>

      {/* Left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <DirectionBtn direction="left" x={-1} y={0} icon={<ArrowLeft className="w-8 h-8 md:w-9 md:h-9 text-kpatrol-400" />} />
      </div>

      {/* Right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <DirectionBtn direction="right" x={1} y={0} icon={<ArrowRight className="w-8 h-8 md:w-9 md:h-9 text-kpatrol-400" />} />
      </div>

      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-dark-card border-2 border-dark-border flex items-center justify-center">
          <div className={cn(
            'w-3.5 h-3.5 md:w-4 md:h-4 rounded-full transition-colors',
            activeDirection ? 'bg-kpatrol-500' : 'bg-dark-border'
          )} />
        </div>
      </div>

      {/* Diagonal buttons */}
      <div className="absolute top-5 left-5 md:top-6 md:left-6">
        <DirectionBtn direction="up-left" x={-0.7} y={0.7} icon={<ArrowUp className="w-5 h-5 md:w-6 md:h-6 text-dark-muted -rotate-45" />} className="w-14 h-14 md:w-16 md:h-16" />
      </div>
      <div className="absolute top-5 right-5 md:top-6 md:right-6">
        <DirectionBtn direction="up-right" x={0.7} y={0.7} icon={<ArrowUp className="w-5 h-5 md:w-6 md:h-6 text-dark-muted rotate-45" />} className="w-14 h-14 md:w-16 md:h-16" />
      </div>
      <div className="absolute bottom-5 left-5 md:bottom-6 md:left-6">
        <DirectionBtn direction="down-left" x={-0.7} y={-0.7} icon={<ArrowDown className="w-5 h-5 md:w-6 md:h-6 text-dark-muted rotate-45" />} className="w-14 h-14 md:w-16 md:h-16" />
      </div>
      <div className="absolute bottom-5 right-5 md:bottom-6 md:right-6">
        <DirectionBtn direction="down-right" x={0.7} y={-0.7} icon={<ArrowDown className="w-5 h-5 md:w-6 md:h-6 text-dark-muted -rotate-45" />} className="w-14 h-14 md:w-16 md:h-16" />
      </div>
    </div>
  );
}

// Camera Panel Component for Control View
function CameraPanel({ 
  expanded, 
  onToggleExpand, 
  onClose 
}: { 
  expanded: boolean; 
  onToggleExpand: () => void; 
  onClose: () => void;
}) {
  const [streamError, setStreamError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [streamKey, setStreamKey] = useState(Date.now());
  // Real-time tracking
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameAge, setLastFrameAge] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const lastFrameTimeRef = useRef<number | null>(null);
  const autoReconnectRef = useRef<NodeJS.Timeout | null>(null);
  const frameAgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshStream = useCallback(() => {
    setIsLoading(true);
    setStreamError(false);
    setFrameCount(0);
    setIsLive(false);
    setStreamKey(Date.now());
  }, []);

  // Handle each frame arriving (for MJPEG, onLoad fires per-frame in Chromium)
  const handleStreamLoad = useCallback(() => {
    const now = Date.now();
    lastFrameTimeRef.current = now;
    setStreamError(false);
    setIsLoading(false);
    setIsLive(true);
    setFrameCount(prev => prev + 1);
  }, []);

  const handleStreamError = useCallback(() => {
    setStreamError(true);
    setIsLoading(false);
    setIsLive(false);
    // Attempt auto-reconnect after 4 s
    if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);
    autoReconnectRef.current = setTimeout(() => {
      refreshStream();
    }, 4000);
  }, [refreshStream]);

  // Detect stale stream: if no frame for > 8 s mark as offline
  useEffect(() => {
    frameAgeTimerRef.current = setInterval(() => {
      if (lastFrameTimeRef.current) {
        const age = Math.round((Date.now() - lastFrameTimeRef.current) / 1000);
        setLastFrameAge(age);
        if (age > 8) {
          setIsLive(false);
          // Auto-refresh if stale
          if (!streamError) refreshStream();
        }
      }
    }, 1000);
    return () => {
      if (frameAgeTimerRef.current) clearInterval(frameAgeTimerRef.current);
      if (autoReconnectRef.current) clearTimeout(autoReconnectRef.current);
    };
  }, [streamError, refreshStream]);

  return (
    <Card variant="glow" className={cn(
      "relative overflow-hidden transition-all border-2 border-kpatrol-500/40 shadow-lg",
      expanded ? "h-[480px]" : "h-[320px]"
    )}>
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-dark-bg via-dark-bg/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-surface/80 rounded-lg backdrop-blur-sm">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-lg",
              isLive ? "bg-green-500 animate-pulse" : streamError ? "bg-red-500" : "bg-yellow-500 animate-pulse"
            )} />
            <span className="text-sm font-semibold text-dark-text">
              {isLive ? 'LIVE' : streamError ? 'Lỗi kết nối' : 'Đang kết nối...'}
            </span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-surface/80 backdrop-blur-sm rounded">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-xs font-mono text-green-400">{frameCount} frames</span>
            </div>
          )}
          {isLive && lastFrameAge !== null && lastFrameAge < 5 && (
            <span className="text-xs font-medium text-kpatrol-400 bg-kpatrol-500/20 px-2 py-1 rounded">MJPEG ·&nbsp;{lastFrameAge}s ago</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStream}
            className="p-2 bg-dark-surface/80 backdrop-blur-sm rounded-lg hover:bg-kpatrol-500/30 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4 text-dark-text" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 bg-dark-surface/80 backdrop-blur-sm rounded-lg hover:bg-kpatrol-500/30 transition-colors"
            title={expanded ? "Thu nhỏ" : "Phóng to"}
          >
            {expanded ? (
              <Minimize2 className="w-5 h-5 text-dark-text" />
            ) : (
              <Maximize2 className="w-5 h-5 text-dark-text" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-dark-surface/80 backdrop-blur-sm rounded-lg hover:bg-red-500/30 transition-colors"
            title="Đóng camera"
          >
            <X className="w-5 h-5 text-dark-text" />
          </button>
        </div>
      </div>

      {/* Stream Container */}
      <div className="w-full h-full bg-black flex items-center justify-center">
        {streamError ? (
          <div className="flex flex-col items-center gap-4 text-dark-muted p-8">
            <div className="p-6 bg-red-500/10 rounded-full">
              <VideoOff className="w-16 h-16 text-red-400" />
            </div>
            <span className="text-xl font-semibold text-dark-text">Không thể kết nối camera</span>
            <span className="text-sm text-dark-muted">Đang thử kết nối lại tự động...</span>
            <button 
              onClick={refreshStream}
              className="mt-3 px-6 py-3 bg-kpatrol-500 text-white rounded-lg hover:bg-kpatrol-600 transition-colors font-medium"
            >
              Thử ngay
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-4 border-kpatrol-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-base text-dark-muted">Đang kết nối camera...</span>
                </div>
              </div>
            )}
            {/* MJPEG stream — browser keeps multipart connection alive; key forces new connection on refresh */}
            <img
              key={streamKey}
              src={`${STREAM_CONFIG.streamUrl}`}
              alt="Camera Stream"
              className="w-full h-full object-contain"
              onError={handleStreamError}
              onLoad={handleStreamLoad}
            />
            {/* Staleness warning overlay */}
            {!isLoading && lastFrameAge !== null && lastFrameAge > 5 && !streamError && (
              <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-400 text-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Stream chậm — đang tự động làm mới...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent">
        <div className="flex items-center gap-4 text-xs text-dark-muted">
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" />
            MJPEG
          </span>
          <span>•</span>
          <span>{expanded ? '720p Full' : '480p'}</span>
          {isLive && <span className="text-green-400">• {frameCount} frames nhận</span>}
        </div>
        <div className="text-xs font-medium text-kpatrol-400">K-Patrol Camera</div>
      </div>
    </Card>
  );
}
