/**
 * K-Patrol Backend API Client
 * 
 * Base URL:
 *  - Docker/Production: port 4001 (mapped from container port 4000)
 *  - Local dev: port 3002 (from backend/src/main.ts)
 * 
 * Robot Events endpoints are PUBLIC — use robot serial number as identifier.
 * Other endpoints (robots, notifications) require JWT auth.
 */

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4001`
    : 'http://localhost:4001');

export const API_URL = `${API_BASE}/api`;

// Default robot serial number — overridable at runtime via setActiveRobotSerial()
export const ROBOT_SERIAL = process.env.NEXT_PUBLIC_ROBOT_SERIAL ?? 'KPATROL-001';

let _activeRobotSerial: string = ROBOT_SERIAL;

/** Call this when the user selects a different robot. */
export function setActiveRobotSerial(serial: string) {
  _activeRobotSerial = serial;
}

function getSerial() {
  return _activeRobotSerial;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RobotEvent {
  id: string;
  robotId: string;
  eventType: 'movement' | 'alert' | 'system' | 'patrol' | 'connection' | 'error' | 'safety' | 'navigation';
  title: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
  createdAt: string;
}

export interface RobotEventPage {
  items: RobotEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RobotEventStats {
  total: number;
  movements: number;
  alerts: number;
  patrols: number;
  errors: number;
  connections: number;
}

export interface RobotConfig {
  id: string;
  name: string;
  serialNumber: string;
  safetyEnabled: boolean;
  dangerDistance: number;
  cautionDistance: number;
  slowDistance: number;
  defaultSpeed: number;
  status: string;
  batteryLevel: number | null;
  lastSeen: string | null;
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: any) {
    super(message);
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      console.warn(`[API] ${res.status} ${path}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.warn('[API] Backend unavailable:', (err as Error).message);
    return null;
  }
}

async function apiFetchStrict<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const msg = body?.message || body?.error || `Lỗi ${res.status}`;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : String(msg), body);
  }

  return (await res.json()) as T;
}

// ── Robot Events API (Public — no JWT) ──────────────────────────────────────

export const robotEventsApi = {
  /**
   * Log a new robot event to backend (fire-and-forget)
   */
  async log(event: {
    eventType: RobotEvent['eventType'];
    title: string;
    description: string;
    severity?: RobotEvent['severity'];
    data?: Record<string, any>;
  }): Promise<RobotEvent | null> {
    return apiFetch<RobotEvent>('/robot-events', {
      method: 'POST',
      body: JSON.stringify({
        robotSerial: getSerial(),
        ...event,
      }),
    });
  },

  /**
   * Fetch paginated event history
   */
  async getHistory(opts: {
    eventType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<RobotEvent[]> {
    const { eventType, limit = 50, offset = 0 } = opts;
    const page = Math.floor(offset / limit) + 1;
    const params = new URLSearchParams({
      robotSerial: getSerial(),
      page: String(page),
      limit: String(limit),
    });
    if (eventType && eventType !== 'all') {
      params.set('eventType', eventType);
    }
    const result = await apiFetch<RobotEventPage>(`/robot-events?${params}`);
    return result?.items ?? [];
  },

  /**
   * Get event statistics
   */
  async getStats(): Promise<RobotEventStats | null> {
    return apiFetch<RobotEventStats>(
      `/robot-events/stats?robotSerial=${getSerial()}`,
    );
  },

  /**
   * Clear all events
   */
  async clearAll(): Promise<boolean> {
    const result = await apiFetch<{ count: number }>(
      `/robot-events?robotSerial=${getSerial()}`,
      { method: 'DELETE' },
    );
    return result !== null;
  },

  /**
   * Delete a single event
   */
  async deleteOne(id: string): Promise<boolean> {
    const result = await apiFetch<{ count: number }>(
      `/robot-events/${id}?robotSerial=${getSerial()}`,
      { method: 'DELETE' },
    );
    return result !== null;
  },
};

// ── Notifications API (Requires JWT) ─────────────────────────────────────────

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

export const notificationsApi = {
  async getAll(page = 1, limit = 20) {
    return apiFetch<any>(`/notifications?page=${page}&limit=${limit}`, {
      headers: authHeaders(),
    });
  },

  async getUnread() {
    return apiFetch<any[]>('/notifications/unread', {
      headers: authHeaders(),
    });
  },

  async markRead(id: string) {
    return apiFetch<any>(`/notifications/${id}/read`, {
      method: 'POST',
      headers: authHeaders(),
    });
  },

  async markAllRead() {
    return apiFetch<any>('/notifications/read-all', {
      method: 'POST',
      headers: authHeaders(),
    });
  },

  async deleteAll() {
    return apiFetch<any>('/notifications', {
      method: 'DELETE',
      headers: authHeaders(),
    });
  },
};

// ── Robots API (Requires JWT) ─────────────────────────────────────────────────

export interface Robot {
  id: string;
  name: string;
  serialNumber: string;
  description?: string;
  status: string;
  batteryLevel: number | null;
  lastSeen: string | null;
  safetyEnabled: boolean;
  dangerDistance: number;
  defaultSpeed: number;
  userId: string;
  createdAt: string;
}

export const robotsApi = {
  async getAll(): Promise<Robot[]> {
    return (await apiFetch<Robot[]>('/robots', { headers: authHeaders() })) ?? [];
  },

  async getOne(id: string): Promise<Robot | null> {
    return apiFetch<Robot>(`/robots/${id}`, { headers: authHeaders() });
  },

  async create(data: { name: string; serialNumber: string; description?: string }): Promise<Robot> {
    return apiFetchStrict<Robot>('/robots', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Robot>): Promise<Robot | null> {
    return apiFetch<Robot>(`/robots/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<boolean> {
    return (await apiFetch<any>(`/robots/${id}`, { method: 'DELETE', headers: authHeaders() })) !== null;
  },
};

