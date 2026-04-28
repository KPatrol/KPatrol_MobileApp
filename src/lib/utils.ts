import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Sanitize uptime values from MQTT — handles three common publisher bugs:
//   1. Unix epoch timestamp instead of relative seconds (value > 1e9)
//   2. Milliseconds instead of seconds (value > 30 days in seconds)
//   3. Negative or undefined
// A robot won't realistically run > 30 days without restart, so clamp to that.
const MAX_UPTIME_SECONDS = 30 * 24 * 3600;
export function sanitizeUptime(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw) || raw < 0) return 0;
  // Treat values past year-2001-in-seconds as epoch timestamps
  if (raw > 1_000_000_000) {
    const diff = Math.floor(Date.now() / 1000) - raw;
    if (diff > 0 && diff < MAX_UPTIME_SECONDS) return diff;
    return 0;
  }
  // Likely milliseconds if larger than the sane upper bound
  if (raw > MAX_UPTIME_SECONDS) {
    const asSeconds = Math.floor(raw / 1000);
    return asSeconds <= MAX_UPTIME_SECONDS ? asSeconds : 0;
  }
  return Math.floor(raw);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
