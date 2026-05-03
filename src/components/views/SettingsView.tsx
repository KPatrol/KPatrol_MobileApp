'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Wifi,
  Bot,
  Bell,
  Palette,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  HardDrive,
  Download,
  Trash2,
  Info,
  Mail,
  Volume2,
  Vibrate,
  Zap,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  QUICK_ACTION_CATALOG,
  QUICK_ACTION_TONES,
} from '@/lib/quick-actions';
import {
  useRobotStore,
  type QuickActionConfig,
  type QuickActionId,
} from '@/store/robotStore';
import { useMQTT } from '@/providers/MQTTProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { MQTT_CONFIG } from '@/lib/mqtt-config';
import { ROBOT_SERIAL } from '@/lib/api';

const SUPPORT_EMAIL = 'khoa.vu@alphaasimov.com';

type Tone = 'cyan' | 'purple' | 'orange' | 'emerald' | 'red' | 'amber';

const SECTION_TONE: Record<Tone, { ring: string; text: string; bg: string; glow: string; dot: string }> = {
  cyan: {
    ring: 'ring-cyan-500/40',
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-[0_0_18px_rgba(34,211,238,0.25)]',
    dot: 'bg-cyan-400',
  },
  purple: {
    ring: 'ring-purple-500/40',
    text: 'text-purple-300',
    bg: 'bg-purple-500/10',
    glow: 'shadow-[0_0_18px_rgba(168,85,247,0.25)]',
    dot: 'bg-purple-400',
  },
  orange: {
    ring: 'ring-orange-500/40',
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    glow: 'shadow-[0_0_18px_rgba(249,115,22,0.25)]',
    dot: 'bg-orange-400',
  },
  emerald: {
    ring: 'ring-emerald-500/40',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.25)]',
    dot: 'bg-emerald-400',
  },
  red: {
    ring: 'ring-red-500/40',
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    glow: 'shadow-[0_0_18px_rgba(239,68,68,0.25)]',
    dot: 'bg-red-400',
  },
  amber: {
    ring: 'ring-amber-500/40',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.25)]',
    dot: 'bg-amber-400',
  },
};

export function SettingsView() {
  const {
    settings,
    updateSettings,
    safetyMode,
    setSafetyMode,
    obstacleAvoidance,
    setObstacleAvoidance,
    maxSpeed,
    setMaxSpeed,
  } = useRobotStore();
  const mqtt = useMQTT();
  const { user, logout } = useAuthContext();

  const displayName = user?.name?.trim() || 'Người dùng K-Patrol';
  const displayEmail = user?.email || '—';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('') || 'KP';

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<{
    label: string;
    value: string;
    setter?: (v: string) => void;
  } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [storageUsed, setStorageUsed] = useState('0 KB');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    try {
      const storeData = localStorage.getItem('kpatrol-store') || '';
      const bytes = new Blob([storeData]).size;
      setStorageUsed(
        bytes < 1024
          ? `${bytes} B`
          : bytes < 1048576
          ? `${(bytes / 1024).toFixed(1)} KB`
          : `${(bytes / 1048576).toFixed(2)} MB`
      );
    } catch {}
  }, []);

  const brokerUrl = `ws://${MQTT_CONFIG.host}:${MQTT_CONFIG.wsPort}`;

  const handleEdit = (label: string, value: string, setter?: (v: string) => void) => {
    setEditingField({ label, value, setter });
    setEditValue(value);
    setShowEditModal(true);
  };

  // ===== Quick actions configuration =====
  const quickActionConfigs = settings.quickActions ?? [];
  const quickActionMap = useMemo(() => {
    const map = new Map<QuickActionId, QuickActionConfig>();
    for (const qa of quickActionConfigs) map.set(qa.id, qa);
    return map;
  }, [quickActionConfigs]);
  const enabledQuickCount = quickActionConfigs.filter((qa) => qa.enabled).length;

  const toggleQuickAction = (id: QuickActionId, on: boolean) => {
    const existing = quickActionConfigs;
    const idx = existing.findIndex((qa) => qa.id === id);
    let next: QuickActionConfig[];
    if (idx >= 0) {
      next = existing.map((qa) =>
        qa.id === id ? { ...qa, enabled: on, active: on ? qa.active : false } : qa
      );
    } else if (on) {
      next = [...existing, { id, enabled: true, active: false }];
    } else {
      next = existing;
    }
    updateSettings({ quickActions: next });
  };

  return (
    <div className="md:h-full flex flex-col gap-3 md:gap-4 md:min-h-0 w-full">
      {/* Profile HUD card */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative p-4 md:p-5 flex items-center gap-3 md:gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-lg md:text-xl font-black tracking-wider shadow-[0_0_24px_rgba(34,211,238,0.4)] ring-1 ring-cyan-400/50">
              {initials}
            </div>
            <span
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950',
                mqtt.isRobotOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-slate-600'
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold mb-0.5">
              Operator Profile
            </p>
            <h3 className="text-base md:text-lg font-bold text-white truncate">{displayName}</h3>
            <p className="text-xs md:text-sm text-slate-400 truncate font-mono">{displayEmail}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
                  mqtt.isRobotOnline
                    ? 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/40'
                    : 'text-slate-400 bg-slate-500/10 ring-slate-500/40'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    mqtt.isRobotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  )}
                />
                {mqtt.isRobotOnline ? 'Robot Online' : 'Robot Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable settings sections — responsive grid uses full width */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto -mx-1 px-1 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 auto-rows-min">
        {/* Connection Settings */}
        <SettingsSection
          title="Kết nối"
          icon={Wifi}
          tone="cyan"
          description="Cấu hình kết nối MQTT với robot"
        >
          <SettingRow
            label="MQTT Broker"
            value={brokerUrl}
            status={mqtt.isConnected ? 'connected' : 'error'}
            mono
          />
          <SettingRow label="Robot Serial" value={ROBOT_SERIAL} mono />
          <SettingRow
            label="Trạng thái Robot"
            status={mqtt.isRobotOnline ? 'connected' : 'error'}
            value={mqtt.isRobotOnline ? 'Online' : 'Offline'}
          />
          <SettingRow
            label="Tự động kết nối lại"
            toggle
            enabled={settings.autoReconnect}
            onToggle={(v) => updateSettings({ autoReconnect: v })}
          />
          {!mqtt.isConnected && (
            <div className="py-3">
              <button
                onClick={mqtt.connect}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] transition-all"
              >
                <Zap className="w-4 h-4" />
                Kết nối ngay
              </button>
            </div>
          )}
        </SettingsSection>

        {/* Robot Settings */}
        <SettingsSection
          title="Robot"
          icon={Bot}
          tone="purple"
          description="Cấu hình thông số robot"
        >
          <SettingRow
            label="Tốc độ tối đa"
            value={`${maxSpeed.toFixed(1)} m/s`}
            editable
            onEdit={(label, value) =>
              handleEdit(label, value, (v) => {
                const n = parseFloat(v);
                if (!isNaN(n) && n > 0 && n <= 2) setMaxSpeed(n);
              })
            }
          />
          <SettingRow
            label="Chế độ an toàn"
            toggle
            enabled={safetyMode}
            onToggle={(v) => {
              setSafetyMode(v);
              mqtt.setSafetyEnabled(v);
            }}
          />
          <SettingRow
            label="Tự động tránh vật cản"
            toggle
            enabled={obstacleAvoidance}
            onToggle={setObstacleAvoidance}
          />
        </SettingsSection>

        {/* Quick Actions Configuration — controls what shows in the sidebar */}
        <SettingsSection
          title="Thao tác nhanh"
          icon={Sparkles}
          tone="emerald"
          description={`Chọn các nút hiển thị trên sidebar (${enabledQuickCount}/${QUICK_ACTION_CATALOG.length} đã bật)`}
        >
          <div className="space-y-1 pt-1">
            {QUICK_ACTION_CATALOG.map((def) => {
              const config = quickActionMap.get(def.id);
              const isEnabled = config?.enabled ?? false;
              const tone = QUICK_ACTION_TONES[def.tone];
              const Icon = def.icon;
              return (
                <div
                  key={def.id}
                  className={cn(
                    'flex items-center gap-3 px-2.5 py-2.5 rounded-xl ring-1 transition-all',
                    isEnabled
                      ? `${tone.bg} ${tone.ring}`
                      : 'bg-slate-950/40 ring-slate-800/40 hover:ring-slate-700/60'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg ring-1 shrink-0 transition-all',
                      isEnabled
                        ? `${tone.iconBg} ${tone.ring} ${tone.glow}`
                        : 'bg-slate-900/60 ring-slate-700/40'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isEnabled ? tone.text : 'text-slate-500'
                      )}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        isEnabled ? 'text-white' : 'text-slate-300'
                      )}
                    >
                      {def.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {def.description}
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={isEnabled}
                    onChange={(v) => toggleQuickAction(def.id, v)}
                  />
                </div>
              );
            })}
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Thông báo"
          icon={Bell}
          tone="amber"
          description="Quản lý thông báo đẩy và cảnh báo"
        >
          <SettingRow
            label="Thông báo đẩy"
            toggle
            enabled={settings.pushNotifications}
            onToggle={(v) => updateSettings({ pushNotifications: v })}
          />
          <SettingRow
            label="Âm thanh"
            toggle
            icon={Volume2}
            enabled={settings.soundEnabled}
            onToggle={(v) => updateSettings({ soundEnabled: v })}
          />
          <SettingRow
            label="Rung"
            toggle
            icon={Vibrate}
            enabled={settings.vibrationEnabled}
            onToggle={(v) => updateSettings({ vibrationEnabled: v })}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          title="Giao diện"
          icon={Palette}
          tone="purple"
          description="Tùy chỉnh giao diện ứng dụng"
        >
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {settings.darkMode ? (
                <Moon className="w-4 h-4 text-purple-300" />
              ) : (
                <Sun className="w-4 h-4 text-amber-300" />
              )}
              <span className="text-slate-200">Chế độ tối</span>
            </div>
            <ToggleSwitch enabled={settings.darkMode} onChange={(v) => updateSettings({ darkMode: v })} />
          </div>
          <SettingRow label="Ngôn ngữ" value="Tiếng Việt" />
        </SettingsSection>

        {/* Storage & Data */}
        <SettingsSection
          title="Dữ liệu & Lưu trữ"
          icon={HardDrive}
          tone="orange"
          description="Quản lý dữ liệu ứng dụng"
        >
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-200">Dung lượng lưu trữ local</span>
              <span className="text-sm font-mono tabular-nums text-orange-300">{storageUsed}</span>
            </div>
          </div>
          <div className="pt-3 flex gap-2">
            <button
              onClick={() => {
                const data = JSON.stringify(localStorage.getItem('kpatrol-store'), null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kpatrol-export-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 font-bold uppercase tracking-wider text-xs hover:bg-slate-700/60 hover:border-cyan-500/40 transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => {
                if (confirm('Xóa tất cả dữ liệu cache? Hành động này không thể hoàn tác.')) {
                  localStorage.removeItem('kpatrol-store');
                  window.location.reload();
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 ring-1 ring-red-500/40 text-red-300 font-bold uppercase tracking-wider text-xs hover:bg-red-500/20 hover:ring-red-500/60 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Xóa Cache
            </button>
          </div>
        </SettingsSection>

        {/* About & Info */}
        <SettingsSection
          title="Thông tin"
          icon={Info}
          tone="emerald"
          description="Thông tin ứng dụng và hệ thống"
        >
          <SettingRow
            label="Phiên bản App"
            value={process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
            mono
          />
          <div className="pt-3">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('K-Patrol Hỗ trợ')}`}
              className="block"
            >
              <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider text-xs hover:bg-emerald-500/20 hover:ring-emerald-500/60 transition-all">
                <Mail className="w-4 h-4" />
                Liên hệ hỗ trợ
              </button>
            </a>
          </div>
        </SettingsSection>

        {/* Account Actions — full width across all grid columns */}
        <div className="md:col-span-2 xl:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-red-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
          <div className="relative p-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/40 text-red-300 font-bold uppercase tracking-widest text-sm hover:bg-red-500/20 hover:ring-red-500/60 hover:shadow-[0_0_24px_rgba(239,68,68,0.3)] transition-all"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setShowEditModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-cyan-500/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-bold">
                    Chỉnh sửa
                  </p>
                  <h3 className="text-lg font-bold text-white">{editingField?.label}</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-400 hover:text-cyan-300 hover:ring-cyan-500/40 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                    {editingField?.label}
                  </label>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/60 text-white font-mono tabular-nums focus:outline-none focus:ring-cyan-500/60 focus:bg-slate-950/80 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 font-bold uppercase tracking-wider text-sm hover:bg-slate-700/60 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (editingField?.setter) editingField.setter(editValue);
                      setShowEditModal(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] transition-all"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-red-500/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
            <div className="relative p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-red-500/10 ring-1 ring-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.25)]">
                  <LogOut className="w-5 h-5 text-red-300" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-bold">
                    Cảnh báo
                  </p>
                  <h3 className="text-lg font-bold text-white">Xác nhận đăng xuất</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 ring-1 ring-slate-700/60 text-slate-200 font-bold uppercase tracking-wider text-sm hover:bg-slate-700/60 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 ring-1 ring-red-500/60 text-red-200 font-bold uppercase tracking-wider text-sm hover:bg-red-500/30 hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] transition-all"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  icon: React.ElementType;
  tone: Tone;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, icon: Icon, tone, description, children }: SettingsSectionProps) {
  const t = SECTION_TONE[tone];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-slate-700/40 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', t.bg.replace('bg-', 'via-').replace('/10', '/40'))} />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl ring-1', t.bg, t.ring, t.glow)}>
            <Icon className={cn('w-4 h-4', t.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="mt-3 divide-y divide-slate-800/60">{children}</div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  value?: string;
  editable?: boolean;
  toggle?: boolean;
  defaultEnabled?: boolean;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  onEdit?: (label: string, value: string) => void;
  status?: 'connected' | 'good' | 'warning' | 'error' | 'update';
  icon?: React.ElementType;
  mono?: boolean;
}

function SettingRow({
  label,
  value,
  editable,
  toggle,
  defaultEnabled,
  enabled: controlledEnabled,
  onToggle,
  onEdit,
  status,
  icon: Icon,
  mono,
}: SettingRowProps) {
  const isControlled = controlledEnabled !== undefined;
  const [internalEnabled, setInternalEnabled] = useState(defaultEnabled ?? false);
  const enabled = isControlled ? controlledEnabled! : internalEnabled;
  const handleToggle = (v: boolean) => {
    if (isControlled) onToggle?.(v);
    else setInternalEnabled(v);
  };

  const getStatusBadge = () => {
    const map: Record<string, { tone: Tone; label: string }> = {
      connected: { tone: 'emerald', label: 'Đã kết nối' },
      good: { tone: 'emerald', label: 'Tốt' },
      warning: { tone: 'amber', label: 'Cảnh báo' },
      error: { tone: 'red', label: 'Lỗi' },
      update: { tone: 'cyan', label: 'Cập nhật' },
    };
    const s = status ? map[status] : null;
    if (!s) return null;
    const t = SECTION_TONE[s.tone];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ring-1',
          t.text,
          t.bg,
          t.ring
        )}
      >
        <span className={cn('w-1 h-1 rounded-full', t.dot)} />
        {s.label}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <span className="text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {toggle ? (
          <ToggleSwitch enabled={enabled} onChange={handleToggle} />
        ) : editable && onEdit ? (
          <button
            onClick={() => onEdit(label, value || '')}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <span className={cn('text-sm', mono && 'font-mono tabular-nums')}>{value}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className={cn('text-sm text-slate-400', mono && 'font-mono tabular-nums')}>{value}</span>
        )}
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'w-12 h-6 rounded-full transition-all relative ring-1',
        enabled
          ? 'bg-cyan-500/80 ring-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
          : 'bg-slate-800/80 ring-slate-700/60'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md',
          enabled ? 'left-7' : 'left-1'
        )}
      />
    </button>
  );
}
