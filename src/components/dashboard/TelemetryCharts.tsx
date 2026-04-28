'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useRobotStore } from '@/store/robotStore';

interface TelemetryPoint {
  time: string;
  timestamp: number;
  battery: number;
  temperature: number;
  cpu: number;
  memory: number;
  speed: number;
}

const MAX_POINTS = 60; // 5 minutes at 5s interval

export default function TelemetryCharts() {
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [activeChart, setActiveChart] = useState<'resource' | 'battery' | 'speed'>('resource');

  const batteryLevel = useRobotStore((s) => s.batteryLevel);
  const temperature = useRobotStore((s) => s.temperature);
  const cpuUsage = useRobotStore((s) => s.cpuUsage);
  const memoryUsage = useRobotStore((s) => s.memoryUsage);
  const speed = useRobotStore((s) => s.speed);
  const isConnected = useRobotStore((s) => s.isConnected);

  // Sample telemetry every 5 seconds
  const sampleTelemetry = useCallback(() => {
    if (!isConnected) return;

    const now = new Date();
    const point: TelemetryPoint = {
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: now.getTime(),
      battery: batteryLevel ?? 0,
      temperature: temperature ?? 0,
      cpu: cpuUsage ?? 0,
      memory: memoryUsage ?? 0,
      speed: speed ?? 0,
    };

    setHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [isConnected, batteryLevel, temperature, cpuUsage, memoryUsage, speed]);

  useEffect(() => {
    const interval = setInterval(sampleTelemetry, 5000);
    return () => clearInterval(interval);
  }, [sampleTelemetry]);

  const tabs = [
    { key: 'resource' as const, label: 'CPU / RAM' },
    { key: 'battery' as const, label: 'Pin / Nhiệt' },
    { key: 'speed' as const, label: 'Tốc độ' },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">
          📊 Telemetry Real-time
        </h3>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveChart(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeChart === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48">
        {history.length < 2 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            {isConnected ? 'Đang thu thập dữ liệu...' : 'Chưa kết nối robot'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'resource' ? (
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#ccc' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="memory" name="RAM" stroke="#a855f7" fill="url(#memGrad)" strokeWidth={2} />
              </AreaChart>
            ) : activeChart === 'battery' ? (
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10, fill: '#888' }} unit="%" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 80]} tick={{ fontSize: 10, fill: '#888' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#ccc' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="battery" name="Pin %" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="temperature" name="Nhiệt °C" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} unit=" m/s" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#ccc' }}
                />
                <Area type="monotone" dataKey="speed" name="Tốc độ" stroke="#06b6d4" fill="url(#speedGrad)" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
        <span>{history.length} mẫu</span>
        <span>Cập nhật mỗi 5 giây</span>
      </div>
    </div>
  );
}
