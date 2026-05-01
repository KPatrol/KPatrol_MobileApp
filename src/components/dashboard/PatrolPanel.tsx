'use client';

import { useState } from 'react';
import { useMQTT } from '@/providers/MQTTProvider';
import { cn } from '@/lib/utils';
import {
  Navigation, Play, Square, Radio, AlertTriangle, Zap,
  Bell, Lightbulb, MapPin, Compass, Plus, Trash2, Activity,
  Crosshair, Route,
} from 'lucide-react';
import type {
  NavMode, BuzzerPattern, LightPattern, GPSWaypoint,
} from '@/lib/mqtt-config';

const MODES: { mode: NavMode; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { mode: 'MANUAL',             label: 'Thủ công',     icon: Radio,         color: 'text-slate-300', desc: 'Điều khiển trực tiếp qua cần lái' },
  { mode: 'AUTO_FREE_COVERAGE', label: 'Phủ vùng',     icon: Compass,       color: 'text-cyan-400',  desc: 'Indoor: random-walk + frontier' },
  { mode: 'AUTO_LINE_FOLLOW',   label: 'Bám line',     icon: Route,         color: 'text-violet-400', desc: 'Camera bám vạch sàn (PD)' },
  { mode: 'AUTO_GPS_WAYPOINT',  label: 'GPS waypoint', icon: Crosshair,     color: 'text-emerald-400', desc: 'Outdoor: lộ trình GPS + an toàn' },
  { mode: 'EMERGENCY',          label: 'Khẩn cấp',     icon: AlertTriangle, color: 'text-red-400',   desc: 'Motor đã dừng — chờ giải toả' },
];

const BUZZ_PATTERNS: { pat: BuzzerPattern; label: string }[] = [
  { pat: 'OFF',   label: 'Tắt' },
  { pat: 'ON',    label: 'Liên tục' },
  { pat: 'BEEP',  label: 'Bíp' },
  { pat: 'ALARM', label: 'Báo động' },
  { pat: 'SOS',   label: 'SOS' },
];

const LIGHT_PATTERNS: { pat: LightPattern; label: string }[] = [
  { pat: 'OFF',         label: 'Tắt' },
  { pat: 'WARN_BLINK',  label: 'Nháy cảnh báo' },
  { pat: 'WARN_STROBE', label: 'Strobe' },
  { pat: 'BOTH_BLINK',  label: 'Cả hai nháy' },
  { pat: 'SOS',         label: 'SOS Morse' },
];

export function PatrolPanel() {
  const {
    isRobotOnline,
    navStatus,
    gpsStatus,
    gpsRoute,
    buzzerPattern,
    lightPattern,
    sendNavCommand,
    sendGpsRoute,
    sendBuzzerPattern,
    sendLightPattern,
    emergencyStop,
    gpsData,
  } = useMQTT();

  const currentMode: NavMode = (navStatus?.mode as NavMode) ?? 'MANUAL';
  const navState = navStatus?.state ?? 'idle';

  const [wpLat, setWpLat] = useState('');
  const [wpLon, setWpLon] = useState('');
  const [wpRadius, setWpRadius] = useState('3');
  const [wpSpeed, setWpSpeed] = useState('40');
  const [routeLoop, setRouteLoop] = useState(false);
  const [draftRoute, setDraftRoute] = useState<GPSWaypoint[]>([]);

  function switchMode(mode: NavMode) {
    if (mode === 'MANUAL')                  sendNavCommand('manual');
    else if (mode === 'AUTO_FREE_COVERAGE') sendNavCommand('auto_free_coverage_start');
    else if (mode === 'AUTO_LINE_FOLLOW')   sendNavCommand('auto_line_follow_start');
    else if (mode === 'AUTO_GPS_WAYPOINT')  sendNavCommand('auto_gps_waypoint_start');
    else if (mode === 'EMERGENCY')          emergencyStop();
  }

  function addCurrentLocationAsWaypoint() {
    if (!gpsData?.latitude || !gpsData?.longitude) return;
    setDraftRoute(r => [...r, {
      lat: Number(gpsData.latitude),
      lon: Number(gpsData.longitude),
      radius_m: Number(wpRadius) || 3,
      speed_pct: Number(wpSpeed) || 40,
    }]);
  }

  function addManualWaypoint() {
    const lat = Number(wpLat), lon = Number(wpLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setDraftRoute(r => [...r, {
      lat, lon,
      radius_m: Number(wpRadius) || 3,
      speed_pct: Number(wpSpeed) || 40,
    }]);
    setWpLat('');
    setWpLon('');
  }

  function removeWaypoint(idx: number) {
    setDraftRoute(r => r.filter((_, i) => i !== idx));
  }

  function uploadRoute() {
    if (draftRoute.length === 0) return;
    sendGpsRoute('set', draftRoute, { loop: routeLoop });
  }

  function startRoute() {
    sendGpsRoute('start');
  }

  function stopRoute() {
    sendGpsRoute('stop');
  }

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-kpatrol-400" />
            <span className="text-sm font-medium text-white">Chế độ điều hướng</span>
          </div>
          <span className="text-xs text-slate-400">
            Trạng thái: <strong className={cn(
              currentMode === 'EMERGENCY' ? 'text-red-400'
                : currentMode === 'AUTO_GPS_WAYPOINT' ? 'text-emerald-400'
                : currentMode === 'AUTO_LINE_FOLLOW' ? 'text-violet-400'
                : currentMode === 'AUTO_FREE_COVERAGE' ? 'text-cyan-400'
                : 'text-slate-300',
            )}>{MODES.find(m => m.mode === currentMode)?.label ?? currentMode}</strong>
            <span className="text-slate-500 ml-2">· {navState}</span>
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {MODES.map(({ mode, label, icon: Icon, color, desc }) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              disabled={!isRobotOnline}
              title={desc}
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

      {/* Auto-mode live status */}
      {(currentMode === 'AUTO_GPS_WAYPOINT' || currentMode === 'AUTO_FREE_COVERAGE' || currentMode === 'AUTO_LINE_FOLLOW') && (
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className={cn(
              'w-4 h-4',
              navState === 'running' ? 'text-emerald-400 animate-pulse'
                : navState === 'emergency' ? 'text-red-400'
                : navState === 'done' ? 'text-green-400'
                : 'text-slate-500',
            )} />
            <span className="text-sm font-medium text-white">
              {navState === 'running' ? 'Đang chạy'
                : navState === 'paused' ? 'Tạm dừng'
                : navState === 'emergency' ? 'Khẩn cấp'
                : navState === 'done' ? 'Hoàn tất'
                : 'Chờ lệnh'}
            </span>
            {currentMode === 'AUTO_GPS_WAYPOINT' && navStatus?.current_waypoint !== undefined && (
              <span className="ml-auto text-xs text-slate-400">
                Waypoint {navStatus.current_waypoint + 1}/{navStatus.total_waypoints ?? '?'}
              </span>
            )}
          </div>

          {currentMode === 'AUTO_GPS_WAYPOINT' && (navStatus?.distance_remaining_m !== undefined || navStatus?.bearing_deg !== undefined) && (
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              {navStatus?.distance_remaining_m !== undefined && (
                <span>Còn lại: <strong className="text-emerald-300">{navStatus.distance_remaining_m.toFixed(1)} m</strong></span>
              )}
              {navStatus?.bearing_deg !== undefined && (
                <span>Hướng: <strong className="text-emerald-300">{navStatus.bearing_deg.toFixed(0)}°</strong></span>
              )}
            </div>
          )}

          {navStatus?.error && (
            <p className="text-xs text-red-400">Lỗi: {navStatus.error}</p>
          )}
        </div>
      )}

      {/* GPS waypoint editor */}
      {currentMode === 'AUTO_GPS_WAYPOINT' && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Lộ trình GPS</span>
              <span className="text-xs text-slate-500">({draftRoute.length} điểm)</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={routeLoop}
                onChange={e => setRouteLoop(e.target.checked)}
                className="accent-emerald-500"
              />
              Lặp
            </label>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="number"
                step="0.000001"
                placeholder="Vĩ độ (lat)"
                value={wpLat}
                onChange={e => setWpLat(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <input
                type="number"
                step="0.000001"
                placeholder="Kinh độ (lon)"
                value={wpLon}
                onChange={e => setWpLon(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Bán kính chấp nhận (m)"
                value={wpRadius}
                onChange={e => setWpRadius(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <input
                type="number"
                step="5"
                min="10"
                max="100"
                placeholder="Tốc độ %"
                value={wpSpeed}
                onChange={e => setWpSpeed(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addManualWaypoint}
                disabled={!wpLat || !wpLon}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-200 text-xs font-medium hover:bg-slate-700/50 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm theo toạ độ
              </button>
              <button
                onClick={addCurrentLocationAsWaypoint}
                disabled={!gpsData?.latitude || !gpsData?.longitude}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 disabled:opacity-40 transition-colors"
                title="Lấy toạ độ hiện tại từ GPS"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Vị trí hiện tại
              </button>
            </div>

            {draftRoute.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {draftRoute.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                    <span className="text-slate-300 font-mono flex-1">
                      {wp.lat.toFixed(6)}, {wp.lon.toFixed(6)}
                    </span>
                    <span className="text-slate-500">±{wp.radius_m}m · {wp.speed_pct}%</span>
                    <button
                      onClick={() => removeWaypoint(i)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={uploadRoute}
                disabled={!isRobotOnline || draftRoute.length === 0}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 disabled:opacity-40 transition-colors"
              >
                Nạp lên robot
              </button>
              <button
                onClick={startRoute}
                disabled={!isRobotOnline}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 disabled:opacity-40 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Bắt đầu
              </button>
              <button
                onClick={stopRoute}
                disabled={!isRobotOnline}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/25 disabled:opacity-40 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Dừng
              </button>
            </div>

            {gpsRoute.length > 0 && (
              <p className="text-[10px] text-slate-500">
                Robot hiện đang nắm {gpsRoute.length} waypoint · {gpsStatus?.state ?? '—'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Buzzer & Light patterns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Còi báo</span>
            <span className="ml-auto text-xs text-slate-500">{buzzerPattern}</span>
          </div>
          <div className="space-y-1">
            {BUZZ_PATTERNS.map(({ pat, label }) => (
              <button
                key={pat}
                onClick={() => sendBuzzerPattern(pat)}
                disabled={!isRobotOnline}
                className={cn(
                  'w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-left transition-colors',
                  buzzerPattern === pat
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-300 hover:border-slate-600/50',
                  !isRobotOnline && 'opacity-40 cursor-not-allowed',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Đèn cảnh báo</span>
            <span className="ml-auto text-xs text-slate-500">{lightPattern}</span>
          </div>
          <div className="space-y-1">
            {LIGHT_PATTERNS.map(({ pat, label }) => (
              <button
                key={pat}
                onClick={() => sendLightPattern(pat)}
                disabled={!isRobotOnline}
                className={cn(
                  'w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-left transition-colors',
                  lightPattern === pat
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-300 hover:border-slate-600/50',
                  !isRobotOnline && 'opacity-40 cursor-not-allowed',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
