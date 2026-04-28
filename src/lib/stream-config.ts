/**
 * Stream Configuration for KPatrol Robot Camera
 * 
 * Stream is hosted on Raspberry Pi and exposed via Cloudflare Tunnel
 * - MJPEG stream for ultra low latency (50-150ms)
 * - Powered by uStreamer optimized for Raspberry Pi
 */

export const STREAM_CONFIG = {
  // Public URLs via Cloudflare Tunnel
  streamUrl: 'https://stream.khoavd.online/stream',
  snapshotUrl: 'https://stream.khoavd.online/snapshot',
  stateUrl: 'https://stream.khoavd.online/state',
  streamApiUrl: 'https://api.khoavd.online/api/stream-info',
  
  // Local fallback URLs (when on same network - faster)
  localStreamUrl: 'http://192.168.199.108:8080/stream',
  localSnapshotUrl: 'http://192.168.199.108:8080/snapshot',
  localStateUrl: 'http://192.168.199.108:8080/state',
  localApiUrl: 'http://192.168.199.108:5000/api/stream-info',
  
  // Stream settings
  defaultQuality: '720p' as const,
  reconnectInterval: 3000, // ms
  healthCheckInterval: 5000, // ms
};

export interface StreamInfo {
  status: 'online' | 'offline' | 'error';
  resolution: string;
  fps: number;
  latency: number;
  protocol: 'MJPEG' | 'HLS' | 'WebRTC';
  uptime: number;
  clients: number;
}

export interface StreamStatus {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  info: StreamInfo | null;
}

// Helper to check if stream is available
export async function checkStreamHealth(): Promise<boolean> {
  try {
    const response = await fetch(STREAM_CONFIG.streamApiUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to get stream info
export async function getStreamInfo(): Promise<StreamInfo | null> {
  try {
    const response = await fetch(STREAM_CONFIG.streamApiUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}
