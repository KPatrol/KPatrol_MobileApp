'use client';

import { useMQTT } from '@/providers/MQTTProvider';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Bot, RefreshCw } from 'lucide-react';

export function MQTTStatus() {
  const { isConnected, isRobotOnline, connectionError, connect, disconnect, lastHeartbeat } = useMQTT();

  const getTimeSinceHeartbeat = () => {
    if (!lastHeartbeat) return null;
    const diff = Math.floor((Date.now() - lastHeartbeat) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* MQTT Connection Status */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isConnected 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        )}>
          {isConnected ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          MQTT
        </div>
      </div>

      {/* Robot Online Status */}
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isRobotOnline 
          ? 'bg-kpatrol-500/20 text-kpatrol-400' 
          : 'bg-orange-500/20 text-orange-400'
      )}>
        <Bot className="w-3 h-3" />
        {isRobotOnline ? 'Robot Online' : 'Robot Offline'}
      </div>

      {/* Heartbeat */}
      {lastHeartbeat && (
        <span className="text-xs text-dark-muted">
          {getTimeSinceHeartbeat()}
        </span>
      )}

      {/* Reconnect button */}
      {!isConnected && (
        <button
          onClick={connect}
          className="p-1 rounded-md hover:bg-dark-surface transition-colors"
          title="Reconnect"
        >
          <RefreshCw className="w-4 h-4 text-dark-muted hover:text-kpatrol-400" />
        </button>
      )}

      {/* Error indicator */}
      {connectionError && (
        <span className="text-xs text-red-400 max-w-[150px] truncate" title={connectionError}>
          {connectionError}
        </span>
      )}
    </div>
  );
}

export function MQTTStatusCard() {
  const { isConnected, isRobotOnline, robotStatus, lastHeartbeat, connect } = useMQTT();

  return (
    <div className="p-4 bg-dark-surface rounded-lg border border-dark-border">
      <h3 className="text-sm font-medium text-dark-text mb-3">Connection Status</h3>
      
      <div className="space-y-2">
        {/* MQTT */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-muted">MQTT Broker</span>
          <span className={cn(
            'text-xs font-medium',
            isConnected ? 'text-green-400' : 'text-red-400'
          )}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Robot */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-muted">K-Patrol Robot</span>
          <span className={cn(
            'text-xs font-medium',
            isRobotOnline ? 'text-kpatrol-400' : 'text-orange-400'
          )}>
            {isRobotOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Last Heartbeat */}
        {lastHeartbeat && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Last Heartbeat</span>
            <span className="text-xs text-dark-text">
              {new Date(lastHeartbeat).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Robot Status */}
        {robotStatus && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-muted">Battery</span>
              <span className="text-xs text-dark-text">{robotStatus.battery}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-muted">Temperature</span>
              <span className="text-xs text-dark-text">{robotStatus.temperature}°C</span>
            </div>
          </>
        )}
      </div>

      {/* Reconnect */}
      {!isConnected && (
        <button
          onClick={connect}
          className="mt-3 w-full py-2 bg-kpatrol-500/20 hover:bg-kpatrol-500/30 text-kpatrol-400 text-xs font-medium rounded-lg transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
