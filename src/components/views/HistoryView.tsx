'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  AlertTriangle,
  XCircle,
  History,
  Activity,
  Navigation,
  ChevronDown,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Shield,
  Radio,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRobotStore, HistoryItem } from '@/store/robotStore';
import { robotEventsApi, RobotEvent, RobotEventStats } from '@/lib/api';
import { useAppMode } from '@/providers/AppModeProvider';

type HistoryFilter = 'all' | 'movement' | 'alert' | 'system' | 'patrol' | 'safety' | 'navigation' | 'connection' | 'error';
type TimeRange = 'today' | 'week' | 'month' | 'all';

const typeConfig: Record<string, { icon: React.ElementType; label: string; ring: string; text: string; bg: string }> = {
  movement:   { icon: ArrowUpRight,   label: 'Di chuyển', ring: 'ring-cyan-500/30',   text: 'text-cyan-300',   bg: 'bg-cyan-500/10' },
  alert:      { icon: AlertTriangle,  label: 'Cảnh báo',  ring: 'ring-amber-500/30',  text: 'text-amber-300',  bg: 'bg-amber-500/10' },
  system:     { icon: Cpu,            label: 'Hệ thống',  ring: 'ring-fuchsia-500/30',text: 'text-fuchsia-300',bg: 'bg-fuchsia-500/10' },
  error:      { icon: XCircle,        label: 'Lỗi',       ring: 'ring-red-500/30',    text: 'text-red-300',    bg: 'bg-red-500/10' },
  patrol:     { icon: Navigation,     label: 'Tuần tra',  ring: 'ring-emerald-500/30',text: 'text-emerald-300',bg: 'bg-emerald-500/10' },
  safety:     { icon: Shield,         label: 'An toàn',   ring: 'ring-orange-500/30', text: 'text-orange-300', bg: 'bg-orange-500/10' },
  navigation: { icon: Navigation,     label: 'Điều hướng',ring: 'ring-purple-500/30', text: 'text-purple-300', bg: 'bg-purple-500/10' },
  connection: { icon: Radio,          label: 'Kết nối',   ring: 'ring-blue-500/30',   text: 'text-blue-300',   bg: 'bg-blue-500/10' },
};

function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return `${Math.floor(seconds / 86400)} ngày trước`;
}

function isToday(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toDateString() === new Date().toDateString();
}

function isWithinDays(date: Date | string, days: number) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Date.now() - d.getTime() < days * 24 * 60 * 60 * 1000;
}

function toUnifiedItem(item: HistoryItem | RobotEvent) {
  if ('createdAt' in item) {
    return {
      id: item.id, type: item.eventType, title: item.title,
      description: item.description, timestamp: new Date(item.createdAt),
      severity: item.severity, details: item.data,
    };
  }
  return {
    id: item.id, type: item.type, title: item.title,
    description: item.description,
    timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
    severity: 'info' as const, details: item.details as Record<string, any> | undefined,
  };
}

export function HistoryView() {
  const { isDev } = useAppMode();
  const { history: storeHistory, clearHistory } = useRobotStore();
  const [selectedType, setSelectedType] = useState<HistoryFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'backend'>('local');
  const [backendEvents, setBackendEvents] = useState<RobotEvent[]>([]);
  const [backendStats, setBackendStats] = useState<RobotEventStats | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendPage, setBackendPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadBackend = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const limit = 50;
      const data = await robotEventsApi.getHistory({
        eventType: selectedType !== 'all' ? selectedType : undefined,
        limit, offset: page * limit
      });
      if (page === 0) setBackendEvents(data);
      else setBackendEvents(prev => [...prev, ...data]);
      setHasMore(data.length === limit);
      setBackendAvailable(true);
    } catch {
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  const loadStats = useCallback(async () => {
    try {
      const s = await robotEventsApi.getStats();
      setBackendStats(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadBackend(0); setBackendPage(0); loadStats(); }, [loadBackend, loadStats]);

  useEffect(() => {
    if (!isDev && backendAvailable) setSource('backend');
  }, [isDev, backendAvailable]);

  const rawItems = (source === 'backend' && backendAvailable ? backendEvents : storeHistory)
    .map(toUnifiedItem);

  const filteredItems = rawItems.filter(item => {
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (timeRange === 'today' && !isToday(item.timestamp)) return false;
    if (timeRange === 'week' && !isWithinDays(item.timestamp, 7)) return false;
    if (timeRange === 'month' && !isWithinDays(item.timestamp, 30)) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statsTotal = backendStats ? backendStats.total : storeHistory.length;
  const movements = backendStats ? backendStats.movements : storeHistory.filter(i => i.type === 'movement').length;
  const patrols = backendStats ? backendStats.patrols : storeHistory.filter(i => i.type === 'patrol').length;
  const alerts = backendStats ? backendStats.alerts : storeHistory.filter(i => i.type === 'alert').length;
  const errors = backendStats ? backendStats.errors : 0;

  const handleClearAll = async () => {
    if (!confirm('Xóa toàn bộ lịch sử?')) return;
    clearHistory();
    if (backendAvailable) { await robotEventsApi.clearAll(); loadBackend(0); loadStats(); }
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredItems, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `kpatrol-history-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4 min-h-0">
      {/* HUD Header */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="flex items-center justify-between p-3 md:p-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/15 ring-1 ring-cyan-500/40 flex items-center justify-center shadow-[0_0_18px_rgba(34,211,238,0.3)]">
              <History className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-white font-black text-base uppercase tracking-widest">Lịch sử hoạt động</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold tabular-nums">
                {statsTotal} sự kiện{isDev ? (backendAvailable ? ' · Backend online' : ' · Offline') : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconBtn onClick={() => { loadBackend(0); loadStats(); }} title="Làm mới">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </IconBtn>
            <IconBtn onClick={handleExport} title="Xuất JSON">
              <Download className="w-4 h-4" />
            </IconBtn>
            <IconBtn onClick={handleClearAll} title="Xóa tất cả" tone="danger">
              <Trash2 className="w-4 h-4" />
            </IconBtn>
          </div>
        </div>
      </div>

      {/* Source Toggle — dev only */}
      {isDev && (
        <div className="flex gap-2 shrink-0">
          <SegBtn active={source === 'local'} onClick={() => setSource('local')}>
            Phiên này <span className="ml-1 tabular-nums opacity-70">({storeHistory.length})</span>
          </SegBtn>
          <SegBtn
            active={source === 'backend'}
            onClick={() => setSource('backend')}
            disabled={!backendAvailable}
          >
            Backend {!backendAvailable && <span className="opacity-70">(offline)</span>}
          </SegBtn>
        </div>
      )}

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 shrink-0">
        <StatTile label="Tổng" value={statsTotal} icon={Activity}     tone="cyan"    onClick={() => setSelectedType('all')}      active={selectedType === 'all'} />
        <StatTile label="Di chuyển" value={movements} icon={ArrowUpRight} tone="cyan"    onClick={() => setSelectedType('movement')} active={selectedType === 'movement'} />
        <StatTile label="Tuần tra" value={patrols}   icon={Navigation}  tone="emerald" onClick={() => setSelectedType('patrol')}   active={selectedType === 'patrol'} />
        <StatTile label="Cảnh báo" value={alerts}    icon={AlertTriangle} tone="amber" onClick={() => setSelectedType('alert')}    active={selectedType === 'alert'} />
        <StatTile label="Lỗi" value={errors}        icon={XCircle}     tone="red"     onClick={() => setSelectedType('error')}    active={selectedType === 'error'} />
      </div>

      {/* Filters */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-slate-700/40 backdrop-blur-sm p-3 md:p-4 shrink-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/60 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-cyan-500/40 focus:bg-slate-900/60 transition-all"
            />
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="bg-slate-950/60 ring-1 ring-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-cyan-500/40 transition-all cursor-pointer"
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày</option>
            <option value="month">30 ngày</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {(['all', ...Object.keys(typeConfig)] as HistoryFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold ring-1 transition-colors",
                selectedType === t
                  ? "bg-cyan-500/15 ring-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  : "bg-slate-950/40 ring-slate-700/60 text-slate-400 hover:text-slate-200 hover:ring-slate-600"
              )}
            >
              {t === 'all' ? 'Tất cả' : typeConfig[t]?.label ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border border-slate-700/40 backdrop-blur-sm flex-1 min-h-0 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
              <History className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">{loading ? 'Đang tải...' : 'Không có hoạt động nào'}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const config = typeConfig[item.type] ?? typeConfig['system'];
              const Icon = config.icon;
              const isExpanded = expandedItem === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 md:p-4 hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className="flex gap-3 md:gap-4">
                    <div className={cn("w-10 h-10 rounded-xl ring-1 flex items-center justify-center flex-shrink-0", config.ring, config.text, config.bg)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.severity && item.severity !== 'info' && (
                            <span className={cn(
                              'text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1',
                              item.severity === 'error' ? 'bg-red-500/15 text-red-300 ring-red-500/40' :
                              item.severity === 'warning' ? 'bg-amber-500/15 text-amber-300 ring-amber-500/40' :
                              'bg-cyan-500/15 text-cyan-300 ring-cyan-500/40'
                            )}>
                              {item.severity === 'error' ? 'Lỗi' : item.severity === 'warning' ? 'Cảnh báo' : item.severity}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 whitespace-nowrap font-mono tabular-nums">{formatTimeAgo(item.timestamp)}</span>
                          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isExpanded && "rotate-180")} />
                        </div>
                      </div>

                      {isExpanded && item.details && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/60 ring-1 ring-slate-700/40">
                          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-bold">Chi tiết</p>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(item.details as Record<string, unknown>).map(([key, value]) => (
                              <div key={key}>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider capitalize font-bold">{key}</p>
                                <p className="text-xs text-slate-200 font-mono tabular-nums truncate">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {source === 'backend' && hasMore && (
          <div className="p-3 border-t border-slate-700/40 bg-slate-900/60">
            <button
              onClick={() => { const next = backendPage + 1; setBackendPage(next); loadBackend(next); }}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Đang tải...' : 'Xem thêm'}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, tone }: { children: React.ReactNode; onClick?: () => void; title?: string; tone?: 'danger' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-9 h-9 rounded-xl ring-1 flex items-center justify-center bg-slate-950/40 transition-colors',
        tone === 'danger'
          ? 'ring-slate-700/60 text-slate-400 hover:ring-red-500/40 hover:text-red-300'
          : 'ring-slate-700/60 text-slate-300 hover:ring-cyan-500/40 hover:text-cyan-300'
      )}
    >
      {children}
    </button>
  );
}

function SegBtn({
  children, active, onClick, disabled,
}: {
  children: React.ReactNode; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ring-1 transition-colors',
        active
          ? 'bg-cyan-500/15 ring-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
          : 'bg-slate-950/40 ring-slate-700/60 text-slate-400 hover:text-slate-200',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

const TILE_TONE: Record<'cyan' | 'emerald' | 'amber' | 'red', { ring: string; text: string; bg: string; glow: string }> = {
  cyan:    { ring: 'border-cyan-500/30',    text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    glow: 'shadow-[0_0_18px_rgba(34,211,238,0.18)]' },
  emerald: { ring: 'border-emerald-500/30', text: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.18)]' },
  amber:   { ring: 'border-amber-500/30',   text: 'text-amber-300',   bg: 'bg-amber-500/10',   glow: 'shadow-[0_0_18px_rgba(251,191,36,0.18)]' },
  red:     { ring: 'border-red-500/30',     text: 'text-red-300',     bg: 'bg-red-500/10',     glow: 'shadow-[0_0_18px_rgba(248,113,113,0.18)]' },
};

function StatTile({
  label, value, icon: Icon, tone, onClick, active,
}: {
  label: string; value: number; icon: React.ElementType; tone: 'cyan' | 'emerald' | 'amber' | 'red'; onClick?: () => void; active?: boolean;
}) {
  const t = TILE_TONE[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 border backdrop-blur-sm p-3 text-left transition-all',
        active ? cn(t.ring, t.glow) : 'border-slate-700/40 hover:border-slate-600/60'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-xl ring-1 flex items-center justify-center', t.bg, t.ring.replace('border-', 'ring-'))}>
          <Icon className={cn('w-4 h-4', t.text)} />
        </div>
        {active && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)] animate-pulse" />}
      </div>
      <p className={cn('text-2xl md:text-3xl font-black tabular-nums mt-2', active ? t.text : 'text-slate-200')}>{value}</p>
      <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-1">{label}</p>
    </button>
  );
}
