'use client';

import { useState } from 'react';
import {
  MapPin,
  Trash2,
  Save,
  Play,
  Square,
  Navigation,
  Repeat,
  Gauge,
  Library,
  Plus,
  ArrowUp,
  ArrowDown,
  Satellite,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMQTT } from '@/providers/MQTTProvider';
import { usePatrolRouteStore } from '@/store/patrolRouteStore';
import { PhenikaaMap } from '@/components/map/PhenikaaMap';

export function PatrolRouteView() {
  const {
    current,
    routes,
    loop,
    speed,
    selectedRouteId,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    reorderWaypoint,
    clearWaypoints,
    setLoop,
    setSpeed,
    saveRoute,
    loadRoute,
    deleteRoute,
  } = usePatrolRouteStore();

  const { gpsData, sendNavCommand, isConnected, isRobotOnline } = useMQTT();
  const [routeName, setRouteName] = useState('');
  const [running, setRunning] = useState(false);

  const canDispatch = isConnected && isRobotOnline && current.length >= 2;

  const handleStart = () => {
    sendNavCommand('route', {
      waypoints: current.map((w) => ({ lat: w.lat, lng: w.lng })),
      loop,
      speed,
    });
    setRunning(true);
  };

  const handleStop = () => {
    sendNavCommand('idle', {});
    setRunning(false);
  };

  const handleSave = () => {
    const name = routeName.trim() || `Route ${new Date().toLocaleString('vi-VN')}`;
    saveRoute(name);
    setRouteName('');
  };

  const gpsOk = gpsData?.connected;
  const sats = gpsData?.satellites ?? 0;
  const gpsTone = !gpsOk ? 'red' : sats >= 4 ? 'emerald' : 'amber';

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4 min-h-0">
      {/* HUD Header */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative p-3 md:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
              <Navigation className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold">
                Patrol Route Planner
              </p>
              <h2 className="font-bold text-white text-base md:text-lg">Tuần tra theo lộ trình GPS</h2>
              <p className="text-xs text-slate-400">
                Click bản đồ để đặt waypoint • Robot tự đi theo thứ tự
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
                canDispatch
                  ? 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/40'
                  : 'text-slate-400 bg-slate-500/10 ring-slate-500/40'
              )}
            >
              <MapPin className="w-3 h-3" />
              {current.length} điểm
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1 font-mono tabular-nums',
                gpsTone === 'emerald' && 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/40',
                gpsTone === 'amber' && 'text-amber-300 bg-amber-500/10 ring-amber-500/40',
                gpsTone === 'red' && 'text-red-300 bg-red-500/10 ring-red-500/40'
              )}
            >
              <Satellite className="w-3 h-3" />
              {gpsOk ? `GPS · ${sats} sats` : 'GPS Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 md:gap-4">
        {/* Map */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col min-h-[280px]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-10" />
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <PhenikaaMap
              gpsData={gpsData}
              waypoints={current}
              onMapClick={(lat, lng) => addWaypoint(lat, lng)}
              onWaypointDragEnd={updateWaypoint}
              onWaypointDelete={removeWaypoint}
              showRoadNetwork
              followRobot={false}
              height="100%"
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 md:gap-4 min-h-0 overflow-y-auto -mx-1 px-1">
          {/* Run controls */}
          <HudCard tone="emerald" icon={Play} title="Điều khiển">
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!canDispatch || running}
                onClick={handleStart}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <Play className="w-4 h-4" />
                Bắt đầu
              </button>
              <button
                disabled={!running}
                onClick={handleStop}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-red-500/10 ring-1 ring-red-500/40 text-red-300 font-bold uppercase tracking-wider text-sm hover:bg-red-500/20 hover:ring-red-500/60 hover:shadow-[0_0_24px_rgba(239,68,68,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Square className="w-4 h-4" />
                Dừng
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-950/60 ring-1 ring-slate-700/60 p-3 space-y-3">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-slate-200">
                  <Repeat className="w-4 h-4 text-cyan-300" />
                  Lặp lại liên tục
                </span>
                <button
                  onClick={() => setLoop(!loop)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-all relative ring-1',
                    loop
                      ? 'bg-cyan-500/80 ring-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'bg-slate-800/80 ring-slate-700/60'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md',
                      loop ? 'left-7' : 'left-1'
                    )}
                  />
                </button>
              </label>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Gauge className="w-4 h-4 text-purple-300" />
                    Tốc độ
                  </span>
                  <span className="font-mono tabular-nums text-cyan-300 font-bold">
                    {speed.toFixed(2)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            {!canDispatch && current.length < 2 && (
              <p className="text-xs text-slate-400 mt-3 px-1">
                ⓘ Cần ít nhất 2 waypoint để bắt đầu tuần tra.
              </p>
            )}
            {!isRobotOnline && (
              <p className="text-xs text-amber-300 mt-2 px-1">⚠ Robot chưa online (heartbeat).</p>
            )}
          </HudCard>

          {/* Waypoint list */}
          <HudCard
            tone="cyan"
            icon={MapPin}
            title="Waypoints"
            actions={
              <button
                onClick={clearWaypoints}
                disabled={!current.length}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold text-red-300 bg-red-500/10 ring-1 ring-red-500/40 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Xoá hết
              </button>
            }
          >
            {current.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Click trên bản đồ để thêm waypoint
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {current.map((wp, idx) => {
                  const isStart = idx === 0;
                  const isEnd = idx === current.length - 1;
                  const role = isStart ? 'start' : isEnd ? 'end' : 'mid';
                  return (
                    <div
                      key={wp.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/60 hover:ring-cyan-500/30 transition-all"
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black tabular-nums text-white shrink-0 ring-1',
                          role === 'start' &&
                            'bg-emerald-500/80 ring-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
                          role === 'end' &&
                            'bg-red-500/80 ring-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
                          role === 'mid' &&
                            'bg-cyan-500/80 ring-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono tabular-nums text-slate-200 truncate">
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                          {role === 'start' ? 'Xuất phát' : role === 'end' ? 'Kết thúc' : 'Trung gian'}
                        </div>
                      </div>
                      <button
                        onClick={() => idx > 0 && reorderWaypoint(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all"
                        title="Lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => idx < current.length - 1 && reorderWaypoint(idx, idx + 1)}
                        disabled={idx === current.length - 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all"
                        title="Xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeWaypoint(wp.id)}
                        className="p-1 rounded-lg text-red-300 hover:bg-red-500/20 transition-all"
                        title="Xoá"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </HudCard>

          {/* Saved routes */}
          <HudCard tone="purple" icon={Library} title="Lộ trình đã lưu">
            <div className="flex gap-2">
              <input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Tên lộ trình…"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-purple-500/60 transition-all"
              />
              <button
                onClick={handleSave}
                disabled={current.length < 2}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold uppercase tracking-wider text-xs shadow-[0_0_18px_rgba(168,85,247,0.35)] hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            {routes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3 mt-3">Chưa có lộ trình nào.</p>
            ) : (
              <div className="space-y-2 mt-3 max-h-[200px] overflow-y-auto pr-1">
                {routes.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-xl ring-1 transition-all',
                      selectedRouteId === r.id
                        ? 'bg-purple-500/10 ring-purple-500/50 shadow-[0_0_18px_rgba(168,85,247,0.2)]'
                        : 'bg-slate-950/60 ring-slate-700/60 hover:ring-purple-500/30'
                    )}
                  >
                    <button onClick={() => loadRoute(r.id)} className="flex-1 text-left min-w-0">
                      <div className="text-sm text-white truncate font-medium">{r.name}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono tabular-nums">
                        {r.waypoints.length} điểm · {r.loop ? 'LOOP' : 'ONE-SHOT'}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteRoute(r.id)}
                      className="p-1.5 rounded-lg text-red-300 hover:bg-red-500/20 transition-all"
                      title="Xoá"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </HudCard>
        </div>
      </div>
    </div>
  );
}

interface HudCardProps {
  tone: 'cyan' | 'emerald' | 'purple' | 'amber' | 'red';
  icon: React.ElementType;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const HUD_TONE: Record<HudCardProps['tone'], { ring: string; text: string; bg: string; glow: string; via: string }> = {
  cyan: { ring: 'ring-cyan-500/40', text: 'text-cyan-300', bg: 'bg-cyan-500/10', glow: 'shadow-[0_0_18px_rgba(34,211,238,0.25)]', via: 'via-cyan-400/40' },
  emerald: { ring: 'ring-emerald-500/40', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.25)]', via: 'via-emerald-400/40' },
  purple: { ring: 'ring-purple-500/40', text: 'text-purple-300', bg: 'bg-purple-500/10', glow: 'shadow-[0_0_18px_rgba(168,85,247,0.25)]', via: 'via-purple-400/40' },
  amber: { ring: 'ring-amber-500/40', text: 'text-amber-300', bg: 'bg-amber-500/10', glow: 'shadow-[0_0_18px_rgba(245,158,11,0.25)]', via: 'via-amber-400/40' },
  red: { ring: 'ring-red-500/40', text: 'text-red-300', bg: 'bg-red-500/10', glow: 'shadow-[0_0_18px_rgba(239,68,68,0.25)]', via: 'via-red-400/40' },
};

function HudCard({ tone, icon: Icon, title, actions, children }: HudCardProps) {
  const t = HUD_TONE[tone];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-slate-700/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', t.via)} />
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn('p-2 rounded-xl ring-1', t.bg, t.ring, t.glow)}>
              <Icon className={cn('w-4 h-4', t.text)} />
            </div>
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">{title}</h3>
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
