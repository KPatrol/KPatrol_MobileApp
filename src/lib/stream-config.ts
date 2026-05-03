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

// Default timeout — Pi or Cloudflare tunnel could hang on a half-open TCP, so
// abort manually instead of relying on the browser's default (which is none).
const STREAM_FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url: string, timeoutMs: number = STREAM_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Helper to check if stream is available
export async function checkStreamHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(STREAM_CONFIG.streamApiUrl);
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to get stream info
export async function getStreamInfo(): Promise<StreamInfo | null> {
  try {
    const response = await fetchWithTimeout(STREAM_CONFIG.streamApiUrl);
    if (response.ok) {
      return (await response.json()) as StreamInfo;
    }
    return null;
  } catch {
    return null;
  }
}
