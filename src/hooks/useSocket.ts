'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRobotStore } from '@/store/robotStore';

interface SocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface RobotTelemetry {
  batteryLevel: number;
  temperature: number;
  cpuUsage: number;
  ramUsage: number;
  speed: number;
  position: { x: number; y: number; heading: number };
  motorStatus: {
    frontLeft: boolean;
    frontRight: boolean;
    rearLeft: boolean;
    rearRight: boolean;
  };
  sensors: {
    frontDistance: number;
    rearDistance: number;
    leftDistance: number;
    rightDistance: number;
  };
}

interface SocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

type MessageHandler = (payload: unknown) => void;

export function useSocket(config: SocketConfig) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const messageHandlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptRef = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  
  const { setConnected, updateTelemetry } = useRobotStore();

  const {
    url,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 5000,
  } = config;

  // Calculate connection quality based on ping
  const updateConnectionQuality = useCallback((ping: number) => {
    if (ping < 50) setConnectionQuality('excellent');
    else if (ping < 100) setConnectionQuality('good');
    else if (ping < 200) setConnectionQuality('fair');
    else setConnectionQuality('poor');
  }, []);

  // Register message handler
  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }
    messageHandlersRef.current.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  // Remove message handler
  const off = useCallback((type: string, handler: MessageHandler) => {
    messageHandlersRef.current.get(type)?.delete(handler);
  }, []);

  // Send message through socket
  const send = useCallback((type: string, payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: SocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('[Socket] Cannot send message - socket not connected');
    return false;
  }, []);

  // Send robot control command
  const sendControl = useCallback((command: string, data?: unknown) => {
    return send('robot:control', { command, data });
  }, [send]);

  // Movement controls
  const move = useCallback((direction: 'forward' | 'backward' | 'left' | 'right' | 'stop', speed?: number) => {
    return sendControl('move', { direction, speed });
  }, [sendControl]);

  const rotate = useCallback((direction: 'clockwise' | 'counter-clockwise', speed?: number) => {
    return sendControl('rotate', { direction, speed });
  }, [sendControl]);

  const setSpeed = useCallback((speed: number) => {
    return sendControl('setSpeed', { speed: Math.max(0, Math.min(100, speed)) });
  }, [sendControl]);

  const emergencyStop = useCallback(() => {
    return sendControl('emergencyStop', {});
  }, [sendControl]);

  // Camera controls
  const setCameraQuality = useCallback((quality: '480p' | '720p' | '1080p') => {
    return send('camera:quality', { quality });
  }, [send]);

  const setCameraMode = useCallback((mode: 'normal' | 'night' | 'thermal') => {
    return send('camera:mode', { mode });
  }, [send]);

  const startRecording = useCallback(() => {
    return send('camera:startRecording', {});
  }, [send]);

  const stopRecording = useCallback(() => {
    return send('camera:stopRecording', {});
  }, [send]);

  const captureImage = useCallback(() => {
    return send('camera:capture', {});
  }, [send]);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        send('ping', { timestamp: pingTime });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, send]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SocketMessage = JSON.parse(event.data);
      const { type, payload, timestamp } = message;

      // Handle pong response
      if (type === 'pong') {
        const ping = Date.now() - (payload as { timestamp: number }).timestamp;
        setLastPing(ping);
        updateConnectionQuality(ping);
        return;
      }

      // Handle telemetry updates
      if (type === 'robot:telemetry') {
        updateTelemetry(payload as RobotTelemetry);
        return;
      }

      // Handle robot status
      if (type === 'robot:status') {
        const status = payload as { isConnected: boolean };
        setConnected(status.isConnected);
        return;
      }

      // Call registered handlers
      const handlers = messageHandlersRef.current.get(type);
      if (handlers) {
        handlers.forEach((handler) => handler(payload));
      }

      // Also call wildcard handlers
      const wildcardHandlers = messageHandlersRef.current.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach((handler) => handler({ type, payload, timestamp }));
      }
    } catch (error) {
      console.error('[Socket] Failed to parse message:', error);
    }
  }, [setConnected, updateConnectionQuality, updateTelemetry]);

  // Connect to socket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Socket] Already connected');
      return;
    }

    try {
      console.log('[Socket] Connecting to', url);
      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        console.log('[Socket] Connected');
        setIsConnected(true);
        setConnected(true);
        reconnectAttemptRef.current = 0;
        startHeartbeat();

        // Request initial telemetry
        send('robot:requestTelemetry', {});
      };

      socketRef.current.onclose = (event) => {
        console.log('[Socket] Disconnected', event.code, event.reason);
        setIsConnected(false);
        setConnected(false);
        stopHeartbeat();

        // Attempt reconnect
        if (reconnectAttemptRef.current < reconnectAttempts) {
          reconnectAttemptRef.current++;
          console.log(`[Socket] Reconnecting attempt ${reconnectAttemptRef.current}/${reconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.log('[Socket] Max reconnection attempts reached');
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('[Socket] Error:', error);
      };

      socketRef.current.onmessage = handleMessage;
    } catch (error) {
      console.error('[Socket] Connection failed:', error);
    }
  }, [url, reconnectAttempts, reconnectInterval, handleMessage, send, setConnected, startHeartbeat, stopHeartbeat]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnected(false);
    reconnectAttemptRef.current = reconnectAttempts; // Prevent auto-reconnect
  }, [reconnectAttempts, setConnected, stopHeartbeat]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    // State
    isConnected,
    lastPing,
    connectionQuality,
    
    // Connection
    connect,
    disconnect,
    
    // Messaging
    send,
    on,
    off,
    
    // Robot controls
    sendControl,
    move,
    rotate,
    setSpeed,
    emergencyStop,
    
    // Camera controls
    setCameraQuality,
    setCameraMode,
    startRecording,
    stopRecording,
    captureImage,
  };
}

// App-wide socket access goes through SocketProvider's useSocketContext().
// The previous useGlobalSocket() stub always returned null and is removed.
