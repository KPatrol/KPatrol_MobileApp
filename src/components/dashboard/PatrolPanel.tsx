'use client';

import { useMemo, useState } from 'react';
import { useMQTT } from '@/providers/MQTTProvider';
import { cn } from '@/lib/utils';
import {
  Navigation, Play, Square, Radio, AlertTriangle, Zap,
  Circle, RefreshCw, Trash2, Upload, Plus,
  RotateCw, ArrowUp, ArrowDown, ArrowRight,
  Pause, Timer, Activity, Save, X, ChevronDown, ChevronRight,
  Compass, Ruler, CircleDot, PenTool,
} from 'lucide-react';
import type {
  NavMode, ScriptOp, ScriptStep, PatrolScript, ScriptSummary, Waypoint,
} from '@/lib/mqtt-config';
import { PathDrawer } from './PathDrawer';

const MODES: { mode: NavMode; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { mode: 'MANUAL',        label: 'Thủ công',  icon: Radio,          color: 'text-slate-300',  desc: 'Điều khiển trực tiếp qua cần lái' },
  { mode: 'SCRIPT_PATROL', label: 'Tuần tra',  icon: Navigation,     color: 'text-blue-400',   desc: 'Chạy script đã nạp sẵn' },
  { mode: 'EMERGENCY',     label: 'Khẩn cấp',  icon: AlertTriangle,  color: 'text-red-400',    desc: 'Motor đã dừng — chờ giải toả' },
];

const OP_LABELS: Record<ScriptOp, string> = {
  rotate:        'Xoay (độ)',
  rotate_to:     'Xoay đến hướng',
  forward_time:  'Tiến (giây)',
  backward_time: 'Lùi (giây)',
  strafe_time:   'Trượt ngang (giây)',
  forward_until: 'Tiến đến khi ToF',
  strafe_until:  'Trượt đến khi ToF',
  move_distance: 'Di chuyển (mét)',
  arc:           'Cung tròn',
  path:          'Đường đã vẽ',
  pause:         'Dừng chờ',
};

const OP_ORDER: ScriptOp[] = [
  'move_distance', 'forward_time', 'backward_time', 'strafe_time',
  'rotate', 'rotate_to', 'arc',
  'forward_until', 'strafe_until', 'pause',
];

function OpIcon({ op, className }: { op: ScriptOp; className?: string }) {
  const map: Record<ScriptOp, React.ElementType> = {
    rotate:        RotateCw,
    rotate_to:     Compass,
    forward_time:  ArrowUp,
    backward_time: ArrowDown,
    strafe_time:   ArrowRight,
    forward_until: ArrowUp,
    strafe_until:  ArrowRight,
    move_distance: Ruler,
    arc:           CircleDot,
    path:          PenTool,
    pause:         Pause,
  };
  const Icon = map[op];
  return <Icon className={className} />;
}

function defaultStepFor(op: ScriptOp): ScriptStep {
  switch (op) {
    case 'rotate':        return { op, angle_deg: 90,  direction: 'left',  speed_pct: 50 };
    case 'rotate_to':     return { op, heading_deg: 0, speed_pct: 50 };
    case 'forward_time':  return { op, duration_s: 2.0, speed_pct: 50 };
    case 'backward_time': return { op, duration_s: 2.0, speed_pct: 50 };
    case 'strafe_time':   return { op, duration_s: 1.5, direction: 'right', speed_pct: 50 };
    case 'forward_until': return { op, tof_sensor: 'front', tof_min_cm: 30, timeout_s: 10, speed_pct: 40 };
    case 'strafe_until':  return { op, tof_sensor: 'right', tof_min_cm: 30, direction: 'right', timeout_s: 10, speed_pct: 40 };
    case 'move_distance': return { op, distance_m: 1.0, direction: 'forward', speed_pct: 50 };
    case 'arc':           return { op, distance_m: 1.0, angle_deg: 45, speed_pct: 50 };
    case 'path':          return { op, waypoints: [], speed_pct: 50 };
    case 'pause':         return { op, duration_s: 1.0 };
  }
}

export function PatrolPanel() {
  const {
    isRobotOnline,
    navStatus,
    recorderStatus,
    scripts,
    scriptStatus,
    sendNavCommand,
    sendScriptCommand,
    refreshScripts,
    emergencyStop,
  } = useMQTT();

  const currentMode = navStatus?.mode ?? 'MANUAL';
  const [recorderName, setRecorderName] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderLoop, setBuilderLoop] = useState(false);
  const [builderDefaultSpeed, setBuilderDefaultSpeed] = useState(50);
  const [builderSteps, setBuilderSteps] = useState<ScriptStep[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fullLinearMps, setFullLinearMps] = useState(0.50);
  const [fullAngularDps, setFullAngularDps] = useState(90.0);

  const activeName = navStatus?.active_script ?? null;
  const executorState = navStatus?.state ?? 'idle';
  const stepProgress = Math.max(0, Math.min(1, navStatus?.step_progress ?? 0));

  const sortedScripts = useMemo(
    () => [...scripts].sort((a, b) => a.name.localeCompare(b.name)),
    [scripts],
  );

  function switchMode(mode: NavMode) {
    if (mode === 'EMERGENCY') { emergencyStop(); return; }
    if (currentMode === 'EMERGENCY') {
      sendNavCommand('clear_emergency');
    }
    sendNavCommand(mode);
  }

  function startRecording() {
    const name = recorderName.trim();
    if (!name) return;
    sendScriptCommand('record_start', { name });
  }

  function stopRecording() {
    sendScriptCommand('record_stop');
    setRecorderName('');
  }

  function cancelRecording() {
    sendScriptCommand('record_cancel');
    setRecorderName('');
  }

  function addBuilderStep(op: ScriptOp) {
    setBuilderSteps(prev => [...prev, defaultStepFor(op)]);
  }

  function appendFromDrawer(steps: ScriptStep[], waypoints: Waypoint[]) {
    if (steps.length === 0) return;
    // Keep the waypoints as a path step for provenance (round-trips correctly
    // to the Pi, which expands PATH at load time via compile_path_to_steps).
    const pathStep: ScriptStep = { op: 'path', waypoints, speed_pct: builderDefaultSpeed };
    setBuilderSteps(prev => [...prev, pathStep]);
    setDrawerOpen(false);
  }

  function updateBuilderStep(idx: number, patch: Partial<ScriptStep>) {
    setBuilderSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeBuilderStep(idx: number) {
    setBuilderSteps(prev => prev.filter((_, i) => i !== idx));
  }

  function moveBuilderStep(idx: number, dir: -1 | 1) {
    setBuilderSteps(prev => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function saveBuilder() {
    const name = builderName.trim();
    if (!name || builderSteps.length === 0) return;
    const script: PatrolScript = {
      name,
      steps: builderSteps,
      loop: builderLoop,
      default_speed_pct: builderDefaultSpeed,
    };
    sendScriptCommand('save', { script });
    // Reset builder
    setBuilderName('');
    setBuilderSteps([]);
    setBuilderLoop(false);
    setBuilderOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Mode switcher ─────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-kpatrol-400" />
            <span className="text-sm font-medium text-white">Chế độ điều hướng</span>
          </div>
          <span className="text-xs text-slate-400">
            Trạng thái: <strong className={cn(
              currentMode === 'EMERGENCY' ? 'text-red-400'
                : currentMode === 'SCRIPT_PATROL' ? 'text-blue-400'
                : 'text-slate-300',
            )}>{MODES.find(m => m.mode === currentMode)?.label ?? currentMode}</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ mode, label, icon: Icon, color, desc }) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              disabled={!isRobotOnline}
              className={cn(
                'flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all',
                currentMode === mode
                  ? 'bg-kpatrol-500/10 border-kpatrol-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50',
                !isRobotOnline && 'opacity-40 cursor-not-allowed',
              )}
            >
              <Icon className={cn('w-4 h-4', currentMode === mode ? color : 'text-slate-500')} />
              <span className="text-xs font-medium text-white">{label}</span>
              <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
            </button>
          ))}
        </div>

        {currentMode === 'EMERGENCY' && (
          <button
            onClick={() => sendNavCommand('clear_emergency')}
            disabled={!isRobotOnline}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 font-medium text-sm hover:bg-yellow-600/30 transition-colors disabled:opacity-40"
          >
            <Zap className="w-4 h-4" />
            Giải toả khẩn cấp — quay về Thủ công
          </button>
        )}
      </div>

      {/* ── Executor live status (SCRIPT_PATROL) ──────────────────── */}
      {currentMode === 'SCRIPT_PATROL' && (
        <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className={cn(
              'w-4 h-4',
              executorState === 'running' ? 'text-blue-400 animate-pulse'
                : executorState === 'emergency' ? 'text-red-400'
                : executorState === 'done' ? 'text-green-400'
                : 'text-slate-500',
            )} />
            <span className="text-sm font-medium text-white">
              Script: {activeName ?? '—'}
            </span>
            <span className="ml-auto text-xs text-slate-400">
              {navStatus?.step_idx !== undefined ? `Bước ${navStatus.step_idx + 1}/${navStatus.step_total ?? '?'}` : '—'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{navStatus?.step_op ?? 'idle'}</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.round(stepProgress * 100)}%` }}
              />
            </div>
            <span>{Math.round(stepProgress * 100)}%</span>
          </div>

          {navStatus?.error && (
            <p className="text-xs text-red-400">Lỗi: {navStatus.error}</p>
          )}

          <button
            onClick={() => sendScriptCommand('stop')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Dừng script
          </button>
        </div>
      )}

      {/* ── Script library ────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Thư viện script</span>
            <span className="text-xs text-slate-500">({scripts.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBuilderOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              title="Tạo script mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={refreshScripts}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {sortedScripts.length === 0 ? (
          <div className="py-8 text-center">
            <Navigation className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Chưa có script nào</p>
            <p className="text-xs text-slate-600 mt-1">Ghi lộ trình hoặc tạo mới để bắt đầu</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/20 max-h-64 overflow-y-auto">
            {sortedScripts.map((sc: ScriptSummary) => {
              const isActive = activeName === sc.name;
              return (
                <div
                  key={sc.name}
                  className={cn(
                    'px-4 py-2.5 flex items-center gap-3 transition-colors',
                    isActive ? 'bg-blue-500/5' : 'hover:bg-slate-800/30',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{sc.name}</p>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">đang nạp</span>
                      )}
                      {sc.loop && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">loop</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                      <span>{sc.steps} bước</span>
                      <span>{sc.default_speed_pct}% mặc định</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => sendScriptCommand('start', { name: sc.name })}
                      disabled={!isRobotOnline}
                      title="Chạy ngay"
                      className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => sendScriptCommand('load', { name: sc.name })}
                      disabled={!isRobotOnline}
                      title="Nạp"
                      className="p-1.5 rounded-lg bg-slate-700/30 border border-slate-700/40 text-slate-300 hover:bg-slate-700/60 transition-colors disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xoá script "${sc.name}"?`)) {
                          sendScriptCommand('delete', { name: sc.name });
                        }
                      }}
                      title="Xoá"
                      className="p-1.5 rounded-lg hover:bg-red-900/20 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {scriptStatus?.ok === false && scriptStatus.error && (
          <div className="px-4 py-2 border-t border-red-900/30 bg-red-900/10 text-xs text-red-400">
            {scriptStatus.action}: {scriptStatus.error}
          </div>
        )}
      </div>

      {/* ── Recorder (only in MANUAL) ─────────────────────────────── */}
      <div className={cn(
        'border rounded-xl p-4 transition-colors',
        recorderStatus?.active
          ? 'bg-red-900/10 border-red-700/40'
          : 'bg-slate-900/80 border-slate-700/50',
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Circle className={cn(
            'w-4 h-4',
            recorderStatus?.active ? 'text-red-400 animate-pulse' : 'text-slate-500',
          )} />
          <span className="text-sm font-medium text-white">Ghi lộ trình</span>
          {recorderStatus?.active && (
            <span className="ml-auto text-xs text-red-300">
              REC • {recorderStatus.step_count} bước • {recorderStatus.elapsed_s.toFixed(1)}s
            </span>
          )}
        </div>

        {!recorderStatus?.active ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Chuyển về chế độ <strong className="text-slate-300">Thủ công</strong>, nhập tên, rồi bấm "Bắt đầu".
              Mọi lệnh lái thủ công sẽ được chuyển thành các bước script có thể phát lại.
            </p>
            <div className="flex gap-2">
              <input
                value={recorderName}
                onChange={(e) => setRecorderName(e.target.value)}
                placeholder="Tên lộ trình (vd: hành_lang_a)"
                className="flex-1 bg-slate-800 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={startRecording}
                disabled={!isRobotOnline || currentMode !== 'MANUAL' || !recorderName.trim()}
                className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                Bắt đầu
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-medium">{recorderStatus.name}</span>
              <span className="text-slate-500">•</span>
              <span>Lệnh hiện tại: <strong>{recorderStatus.current_cmd ?? '—'}</strong></span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Dừng & Lưu
              </button>
              <button
                onClick={cancelRecording}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 text-sm hover:bg-slate-700/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Script builder (collapsible) ──────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setBuilderOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {builderOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            <span className="text-sm font-medium text-white">Trình dựng script</span>
            {builderSteps.length > 0 && (
              <span className="text-xs text-slate-500">({builderSteps.length} bước)</span>
            )}
          </div>
        </button>

        {builderOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30">
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                value={builderName}
                onChange={(e) => setBuilderName(e.target.value)}
                placeholder="Tên script"
                className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kpatrol-500/50"
              />
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2">
                <Timer className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Tốc độ:</span>
                <input
                  type="number" min={10} max={100} step={5}
                  value={builderDefaultSpeed}
                  onChange={(e) => setBuilderDefaultSpeed(Math.max(10, Math.min(100, Number(e.target.value))))}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={builderLoop}
                onChange={(e) => setBuilderLoop(e.target.checked)}
                className="accent-kpatrol-500"
              />
              Lặp lại (loop)
            </label>

            {/* Calibration */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-[11px]">
                <Ruler className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500">m/s@100%</span>
                <input
                  type="number" min={0.05} max={2} step={0.05}
                  value={fullLinearMps}
                  onChange={(e) => setFullLinearMps(Math.max(0.05, Math.min(2, Number(e.target.value))))}
                  className="flex-1 bg-transparent text-white focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-[11px]">
                <Compass className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500">°/s@100%</span>
                <input
                  type="number" min={10} max={360} step={5}
                  value={fullAngularDps}
                  onChange={(e) => setFullAngularDps(Math.max(10, Math.min(360, Number(e.target.value))))}
                  className="flex-1 bg-transparent text-white focus:outline-none"
                />
              </label>
            </div>

            {/* Path drawer */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/20">
              <button
                onClick={() => setDrawerOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800/40 transition-colors"
              >
                <PenTool className="w-3.5 h-3.5 text-kpatrol-400" />
                Vẽ lộ trình
                {drawerOpen ? <ChevronDown className="ml-auto w-3 h-3" /> : <ChevronRight className="ml-auto w-3 h-3" />}
              </button>
              {drawerOpen && (
                <div className="px-3 pb-3">
                  <PathDrawer
                    speedPct={builderDefaultSpeed}
                    fullLinearMps={fullLinearMps}
                    fullAngularDps={fullAngularDps}
                    onCompiled={appendFromDrawer}
                  />
                </div>
              )}
            </div>

            {/* Add step buttons */}
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">Thêm bước</p>
              <div className="flex flex-wrap gap-1.5">
                {OP_ORDER.map(op => (
                  <button
                    key={op}
                    onClick={() => addBuilderStep(op)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-600/40 text-[11px] text-slate-300 hover:border-kpatrol-500/50 hover:text-kpatrol-400 transition-colors"
                  >
                    <OpIcon op={op} className="w-3 h-3" />
                    {OP_LABELS[op]}
                  </button>
                ))}
              </div>
            </div>

            {/* Step list */}
            {builderSteps.length > 0 && (
              <div className="space-y-1.5">
                {builderSteps.map((step, idx) => (
                  <BuilderStepRow
                    key={idx}
                    index={idx}
                    step={step}
                    onChange={(patch) => updateBuilderStep(idx, patch)}
                    onRemove={() => removeBuilderStep(idx)}
                    onMove={(dir) => moveBuilderStep(idx, dir)}
                    isFirst={idx === 0}
                    isLast={idx === builderSteps.length - 1}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveBuilder}
                disabled={!builderName.trim() || builderSteps.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-kpatrol-500/20 border border-kpatrol-500/40 text-kpatrol-300 text-sm font-medium hover:bg-kpatrol-500/30 transition-colors disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu script
              </button>
              <button
                onClick={() => { setBuilderSteps([]); setBuilderName(''); setBuilderLoop(false); }}
                className="px-3 py-2 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 text-sm hover:bg-slate-700/60 transition-colors"
              >
                Xoá hết
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Builder row: one editable step
// ────────────────────────────────────────────────────────────────
interface BuilderStepRowProps {
  index: number;
  step: ScriptStep;
  onChange: (patch: Partial<ScriptStep>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}

function BuilderStepRow({ index, step, onChange, onRemove, onMove, isFirst, isLast }: BuilderStepRowProps) {
  const needsDirection = step.op === 'rotate' || step.op === 'strafe_time' || step.op === 'strafe_until' || step.op === 'move_distance';
  const needsDuration = step.op === 'forward_time' || step.op === 'backward_time' || step.op === 'strafe_time' || step.op === 'pause';
  const needsAngle = step.op === 'rotate' || step.op === 'arc';
  const needsUntil = step.op === 'forward_until' || step.op === 'strafe_until';
  const needsSpeed = step.op !== 'pause' && step.op !== 'path';
  const needsDistance = step.op === 'move_distance' || step.op === 'arc';
  const needsHeading = step.op === 'rotate_to';
  const isPath = step.op === 'path';

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 w-5 text-right">#{index + 1}</span>
        <OpIcon op={step.op} className="w-3.5 h-3.5 text-kpatrol-400" />
        <span className="text-xs font-medium text-white flex-1">{OP_LABELS[step.op]}</span>
        <button
          onClick={() => onMove(-1)}
          disabled={isFirst}
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3 rotate-180" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={isLast}
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-900/20 text-slate-500 hover:text-red-400"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 pl-7 text-[11px]">
        {isPath && (
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-600/50 text-slate-300">
            {step.waypoints?.length ?? 0} điểm
          </span>
        )}
        {needsAngle && (
          <NumField
            label="Góc°"
            value={step.angle_deg ?? 0}
            min={step.op === 'arc' ? -180 : 0}
            max={180}
            onChange={(v) => onChange({ angle_deg: v })}
          />
        )}
        {needsHeading && (
          <NumField
            label="Hướng°" value={step.heading_deg ?? 0} min={-180} max={180}
            onChange={(v) => onChange({ heading_deg: v })}
          />
        )}
        {needsDistance && (
          <NumField
            label="m" value={step.distance_m ?? 1} min={0.05} max={20} step={0.05}
            onChange={(v) => onChange({ distance_m: v })}
          />
        )}
        {needsDirection && step.op !== 'move_distance' && (
          <select
            value={step.direction ?? 'left'}
            onChange={(e) => onChange({ direction: e.target.value as 'left' | 'right' })}
            className="bg-slate-900 border border-slate-600/50 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
          >
            <option value="left">Trái</option>
            <option value="right">Phải</option>
          </select>
        )}
        {step.op === 'move_distance' && (
          <select
            value={step.direction ?? 'forward'}
            onChange={(e) => onChange({ direction: e.target.value as 'forward' | 'backward' | 'left' | 'right' })}
            className="bg-slate-900 border border-slate-600/50 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
          >
            <option value="forward">Tiến</option>
            <option value="backward">Lùi</option>
            <option value="left">Trượt trái</option>
            <option value="right">Trượt phải</option>
          </select>
        )}
        {needsDuration && (
          <NumField
            label="Giây" value={step.duration_s ?? 1} min={0.1} max={60} step={0.1}
            onChange={(v) => onChange({ duration_s: v })}
          />
        )}
        {needsUntil && (
          <>
            <select
              value={step.tof_sensor ?? 'front'}
              onChange={(e) => onChange({ tof_sensor: e.target.value })}
              className="bg-slate-900 border border-slate-600/50 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
            >
              <option value="front">front</option>
              <option value="front_left">front_left</option>
              <option value="front_right">front_right</option>
              <option value="left">left</option>
              <option value="right">right</option>
              <option value="back">back</option>
            </select>
            <NumField
              label="cm" value={step.tof_min_cm ?? 30} min={5} max={200}
              onChange={(v) => onChange({ tof_min_cm: v })}
            />
            <NumField
              label="Timeout" value={step.timeout_s ?? 10} min={1} max={60}
              onChange={(v) => onChange({ timeout_s: v })}
            />
          </>
        )}
        {needsSpeed && (
          <NumField
            label="%" value={step.speed_pct ?? 50} min={10} max={100} step={5}
            onChange={(v) => onChange({ speed_pct: v })}
          />
        )}
      </div>
    </div>
  );
}

function NumField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 bg-slate-900 border border-slate-600/50 rounded px-1.5 py-0.5">
      <span className="text-slate-500">{label}</span>
      <input
        type="number" min={min} max={max} step={step ?? 1}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-14 bg-transparent text-white text-[11px] focus:outline-none"
      />
    </label>
  );
}
