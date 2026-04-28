'use client';

import dynamic from 'next/dynamic';
import { Satellite, MapPin, Compass, Gauge } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { GPSData } from '@/lib/mqtt-config';

// Leaflet touches `window` at import time — load the inner map only on the client.
const GPSMapInner = dynamic(() => import('./GPSMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-lg border border-dark-border bg-dark-card/50">
      <span className="text-sm text-dark-muted">Đang tải bản đồ…</span>
    </div>
  ),
});

interface GPSMapCardProps {
  gpsData: GPSData | null;
}

function fixQualityLabel(quality?: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } {
  switch (quality) {
    case 1: return { label: 'GPS', variant: 'success' };
    case 2: return { label: 'DGPS', variant: 'success' };
    case 4: return { label: 'RTK fix', variant: 'success' };
    case 5: return { label: 'RTK float', variant: 'warning' };
    case 0:
    case undefined:
    case null:
      return { label: 'No fix', variant: 'danger' };
    default:
      return { label: `Q${quality}`, variant: 'default' };
  }
}

export function GPSMapCard({ gpsData }: GPSMapCardProps) {
  const hasFix = !!(
    gpsData?.connected &&
    typeof gpsData.latitude === 'number' &&
    typeof gpsData.longitude === 'number'
  );
  const fix = fixQualityLabel(gpsData?.fix_quality);
  const sats = gpsData?.satellites ?? 0;
  const hdop = gpsData?.hdop;

  return (
    <Card variant="glow" padding="lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="w-5 h-5 text-kpatrol-400" />
          GPS Outdoor (OpenStreetMap)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={fix.variant}>{fix.label}</Badge>
          <Badge variant={sats >= 6 ? 'success' : sats >= 4 ? 'warning' : 'danger'}>
            {sats} sats
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <GPSMapInner gpsData={gpsData} />

          <div className="space-y-3 text-sm">
            <InfoRow
              icon={<MapPin className="w-4 h-4 text-kpatrol-400" />}
              label="Toạ độ"
              value={
                hasFix
                  ? `${gpsData!.latitude!.toFixed(6)}, ${gpsData!.longitude!.toFixed(6)}`
                  : '—'
              }
              mono
            />
            <InfoRow
              icon={<Gauge className="w-4 h-4 text-status-warning" />}
              label="HDOP"
              value={typeof hdop === 'number' ? hdop.toFixed(2) : '—'}
              hint={
                typeof hdop === 'number'
                  ? hdop < 2
                    ? 'Tốt'
                    : hdop < 5
                    ? 'Trung bình'
                    : 'Yếu'
                  : undefined
              }
            />
            <InfoRow
              icon={<Compass className="w-4 h-4 text-accent-400" />}
              label="Hướng / Tốc độ"
              value={
                gpsData?.course != null || gpsData?.speed != null
                  ? `${gpsData?.course?.toFixed(0) ?? '—'}° • ${gpsData?.speed?.toFixed(2) ?? '—'} m/s`
                  : '—'
              }
            />
            <InfoRow
              icon={<Satellite className="w-4 h-4 text-status-online" />}
              label="Độ cao"
              value={
                typeof gpsData?.altitude === 'number' ? `${gpsData.altitude.toFixed(1)} m` : '—'
              }
            />

            <div className="rounded-lg border border-dark-border bg-dark-card/40 px-3 py-2 text-xs text-dark-muted">
              {hasFix
                ? 'Vòng tròn xanh = bán kính sai số ước lượng (HDOP × 2.5 m).'
                : gpsData?.connected
                ? 'Module GPS đã kết nối, đang chờ đủ vệ tinh để lock fix.'
                : 'Bật KPATROL_GPS_ENABLED=1 và kiểm tra UART2 / NEO-6M.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
  hint,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-dark-card/40 px-3 py-2">
      <div className="flex items-center gap-2 text-dark-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right">
        <div className={`text-dark-text ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
        {hint && <div className="text-[10px] text-dark-muted">{hint}</div>}
      </div>
    </div>
  );
}
