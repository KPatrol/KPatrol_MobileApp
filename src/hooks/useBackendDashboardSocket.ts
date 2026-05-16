'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

// Payload emitted by SocketGateway.broadcastUserRobotStatusChanged (called
// from MqttIngestService whenever a Pi heartbeat flips ONLINE↔OFFLINE). The
// listing page (/robots) consumes this so the row "● online" badge flips
// instantly instead of waiting for the next 5s REST poll.
export interface RobotStatusChanged {
  robotId: string;
  status: 'ONLINE' | 'OFFLINE' | string;
  lastSeen: string;
}

interface Options {
  token: string | null;
  enabled: boolean;
  onStatusChanged: (evt: RobotStatusChanged) => void;
}

/**
 * Connects to the backend `/robot` Socket.IO namespace as a dashboard
 * client (no robotId — receives user-scoped events only).
 *
 * The gateway auto-joins us into the `user:${sub}` room based on JWT.
 * The MQTT→WS bridge (MqttIngestService) then fans heartbeat-derived
 * status flips into that room as `robot:status:changed`.
 */
export function useBackendDashboardSocket({
  token,
  enabled,
  onStatusChanged,
}: Options): void {
  // Hold the callback in a ref so the socket effect doesn't tear down +
  // reconnect every render just because the parent passed a new arrow fn.
  const cbRef = useRef(onStatusChanged);
  useEffect(() => {
    cbRef.current = onStatusChanged;
  }, [onStatusChanged]);

  useEffect(() => {
    if (!enabled || !token) return;

    // socket.io-client picks ws/wss based on the page protocol when path is
    // same-origin. For local dev API_BASE is http://localhost:4001 — io()
    // will upgrade to WebSocket after the polling handshake.
    const url = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket: Socket = io(`${url}/robot`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { type: 'client' },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    socket.on('connect', () => {
      // Intentionally low-key — the listing page doesn't need to surface
      // "connected" anywhere, the green dot is the visible indicator.
      console.log('[DashboardSocket] connected', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[DashboardSocket] connect_error:', err.message);
    });

    socket.on('auth:error', (msg) => {
      console.warn('[DashboardSocket] auth:error:', msg);
    });

    socket.on('robot:status:changed', (evt: RobotStatusChanged) => {
      cbRef.current(evt);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, enabled]);
}
