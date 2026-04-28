'use client';

import { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull,
  BatteryCharging,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Settings,
  User,
  Search,
  X,
  Check,
  Clock
} from 'lucide-react';
import { useRobotStore } from '@/store/robotStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { useMQTT } from '@/providers/MQTTProvider';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { alerts, markAllAlertsRead, markAlertRead, batteryLevel: storeBattery } = useRobotStore();
  const mqtt = useMQTT();
  const batteryLevel = mqtt.robotStatus?.battery ?? storeBattery;
  const isConnected = mqtt.isConnected;
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = alerts.filter(n => !n.read).length;

  const formatTime = (ts: Date | string) => {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'Vừa xong';
    if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
    if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
    return `${Math.floor(s / 86400)} ngày trước`;
  };

  const getBatteryIcon = () => {
    if (batteryLevel > 80) return <BatteryFull className="w-5 h-5" />;
    if (batteryLevel > 50) return <BatteryMedium className="w-5 h-5" />;
    if (batteryLevel > 20) return <BatteryLow className="w-5 h-5" />;
    return <Battery className="w-5 h-5" />;
  };

  const getBatteryColor = () => {
    if (batteryLevel > 50) return 'text-status-success';
    if (batteryLevel > 20) return 'text-status-warning';
    return 'text-status-error';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <header className="h-16 bg-dark-card/80 backdrop-blur-lg border-b border-dark-border flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] hover:bg-dark-surface rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-dark-text" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gradient">{title}</h2>
        </div>
      </div>

      {/* Center: Search (Desktop only) */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input 
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder-dark-muted focus:outline-none focus:border-kpatrol-500/50 focus:ring-1 focus:ring-kpatrol-500/30 transition-all"
          />
        </div>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Signal Strength (Desktop) */}
        <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-dark-surface rounded-lg">
          {(() => {
            const latency = mqtt.lastHeartbeat ? Date.now() - mqtt.lastHeartbeat : null;
            if (!mqtt.isRobotOnline || latency == null) return <><SignalLow className="w-4 h-4 text-dark-muted" /><span className="text-xs text-dark-muted">N/A</span></>;
            if (latency < 200) return <><SignalHigh className="w-4 h-4 text-status-success" /><span className="text-xs text-status-success">{latency}ms</span></>;
            if (latency < 500) return <><SignalMedium className="w-4 h-4 text-status-warning" /><span className="text-xs text-status-warning">{latency}ms</span></>;
            return <><SignalLow className="w-4 h-4 text-status-error" /><span className="text-xs text-status-error">{latency}ms</span></>;
          })()}
        </div>

        {/* Battery */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg",
          batteryLevel <= 20 ? "bg-status-error/10 animate-pulse" : "bg-dark-surface"
        )}>
          <span className={getBatteryColor()}>
            {getBatteryIcon()}
          </span>
          <span className={cn(
            "text-sm font-medium",
            getBatteryColor()
          )}>{batteryLevel}%</span>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
          isConnected 
            ? "bg-status-success/10 border border-status-success/30" 
            : "bg-status-error/10 border border-status-error/30 animate-pulse"
        )}>
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-status-success" />
              <span className="text-sm text-status-success hidden sm:inline font-medium">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-status-error" />
              <span className="text-sm text-status-error hidden sm:inline font-medium">Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Thông báo"
            className={cn(
              "relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all",
              showNotifications
                ? "bg-kpatrol-500/20 text-kpatrol-400"
                : "hover:bg-dark-surface text-dark-text"
            )}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-status-error rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-[20rem] max-w-[calc(100vw-1rem)] bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-4 border-b border-dark-border">
                  <h3 className="font-semibold text-dark-text">Thông báo</h3>
                  <button className="text-sm text-kpatrol-400 hover:text-kpatrol-300" onClick={markAllAlertsRead}>
                    Đánh dấu đã đọc
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-dark-muted text-sm">Không có thông báo</div>
                  ) : alerts.slice(0, 20).map((notification) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-dark-border last:border-0 hover:bg-dark-surface/50 transition-colors cursor-pointer",
                        !notification.read && "bg-kpatrol-500/5"
                      )}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-dark-text text-sm">{notification.title}</p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-kpatrol-500 rounded-full" />
                            )}
                          </div>
                        <p className="text-xs text-dark-muted mt-0.5 line-clamp-2">{notification.message}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="w-3 h-3 text-dark-muted" />
                            <span className="text-xs text-dark-muted">{formatTime(notification.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-dark-border bg-dark-surface/30">
                  <button 
                    className="w-full text-sm text-kpatrol-400 hover:text-kpatrol-300 font-medium transition-colors"
                    onClick={markAllAlertsRead}
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar (Desktop) */}
        <button className="hidden md:flex items-center gap-2 p-1 pr-3 bg-dark-surface rounded-full hover:bg-dark-border transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kpatrol-400 to-kpatrol-600 flex items-center justify-center text-white text-sm font-bold">
            VD
          </div>
          <span className="text-sm text-dark-text font-medium">Admin</span>
        </button>
      </div>
    </header>
  );
}
