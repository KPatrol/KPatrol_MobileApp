/**
 * Stream Configuration for KPatrol Robot Camera
 * 
 * Stream is hosted on Raspberry Pi and exposed via Cloudflare Tunnel
 * - MJPEG stream for ultra low latency (50-150ms)
 * - Powered by uStreamer optimized for Raspberry Pi
 */

// Public stream endpoints (Cloudflare Tunnel) — overridable per environment.
const PUBLIC_STREAM_BASE =
  process.env.NEXT_PUBLIC_STREAM_BASE_URL ?? 'https://stream.khoavd.online';
const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_STREAM_API_BASE_URL ?? 'https://api.khoavd.online';

// Local LAN fallback — only relevant when the operator's browser shares a
// network with the Pi. Set NEXT_PUBLIC_LOCAL_PI_HOST=<ip-or-hostname>:8080
// to enable; an empty value disables local fallback entirely so we don't
// dial a stale IP from a previous demo network.
const LOCAL_HOST = process.env.NEXT_PUBLIC_LOCAL_PI_HOST ?? '';
const LOCAL_API_HOST = process.env.NEXT_PUBLIC_LOCAL_PI_API_HOST ?? '';

export const STREAM_CONFIG = {
  // Public URLs via Cloudflare Tunnel
  streamUrl: `${PUBLIC_STREAM_BASE}/stream`,
  snapshotUrl: `${PUBLIC_STREAM_BASE}/snapshot`,
  stateUrl: `${PUBLIC_STREAM_BASE}/state`,
  streamApiUrl: `${PUBLIC_API_BASE}/api/stream-info`,

  // Local fallback URLs (when on same network - faster). Empty when env var
  // unset; consumers should `if (STREAM_CONFIG.localStreamUrl)` before use.
  localStreamUrl:   LOCAL_HOST ? `http://${LOCAL_HOST}/stream`   : '',
  localSnapshotUrl: LOCAL_HOST ? `http://${LOCAL_HOST}/snapshot` : '',
  localStateUrl:    LOCAL_HOST ? `http://${LOCAL_HOST}/state`    : '',
  localApiUrl:      LOCAL_API_HOST ? `http://${LOCAL_API_HOST}/api/stream-info` : '',

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
