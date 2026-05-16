'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';
import type { SafetyStatus } from '@/lib/mqtt-config';

interface Options {
  token: string | null;
  robotId: string | null;
  enabled: boolean;
  onSafety: (safety: SafetyStatus) => void;
}

// Per-robot Socket.IO bridge for safety frames. Backend's SocketGateway
// (broadcastRobotSafety) re-emits the same MQTT payload the Pi publishes at
// 5 Hz. Browsers behind corporate proxies / mobile data often see the direct
// MQTT-over-WSS connection stall — this socket path goes through the same
// origin as the REST API, which proxies handle reliably. Treat it as a
// fallback: the MQTT handler updates safety too, and a newest-timestamp-wins
// merge in the consumer keeps the freshest frame regardless of which path
// delivered it first.
export function useRobotSafetySocket({
  token,
  robotId,
  enabled,
  onSafety,
}: Options): void {
  const cbRef = useRef(onSafety);
  useEffect(() => {
    cbRef.current = onSafety;
  }, [onSafety]);

  useEffect(() => {
    if (!enabled || !token || !robotId) return;

    const url = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket: Socket = io(`${url}/robot`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { type: 'client', robotId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    socket.on('connect', () => {
      console.log('[SafetySocket] connected', socket.id, 'robot=', robotId);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SafetySocket] connect_error:', err.message);
    });

    socket.on('auth:error', (msg) => {
      console.warn('[SafetySocket] auth:error:', msg);
    });

    socket.on('robot:safety', (safety: SafetyStatus) => {
      if (safety && typeof safety === 'object') cbRef.current(safety);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, robotId, enabled]);
}
