'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPSData } from '@/lib/mqtt-config';

// Fix Leaflet default marker icons under Webpack/Next.js (the bundler rewrites
// asset URLs so the built-in image references break). Point to the CDN copies.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// HDOP → approximate horizontal accuracy radius (metres). The NEO-6M datasheet
// quotes ≈2.5 m CEP; multiply by HDOP to get the 1-σ horizontal error circle.
function hdopRadius(hdop: number | undefined | null): number {
  if (!hdop || hdop <= 0) return 10;
  return Math.max(2, Math.min(50, hdop * 2.5));
}

// Recenter the map when the GPS fix moves significantly.
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface GPSMapInnerProps {
  gpsData: GPSData | null;
}

export default function GPSMapInner({ gpsData }: GPSMapInnerProps) {
  const hasFix = !!(
    gpsData &&
    gpsData.connected &&
    typeof gpsData.latitude === 'number' &&
    typeof gpsData.longitude === 'number' &&
    Number.isFinite(gpsData.latitude) &&
    Number.isFinite(gpsData.longitude)
  );

  // Default centre — Hanoi (used until first fix arrives so the OSM tiles load).
  const center = useMemo<[number, number]>(() => {
    if (hasFix) return [gpsData!.latitude as number, gpsData!.longitude as number];
    return [21.0285, 105.8542];
  }, [hasFix, gpsData]);

  const radius = hdopRadius(gpsData?.hdop);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-dark-border">
      <MapContainer
        center={center}
        zoom={hasFix ? 18 : 13}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {hasFix && (
          <>
            <Recenter lat={center[0]} lng={center[1]} />
            <Circle
              center={center}
              radius={radius}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15, weight: 1 }}
            />
            <Marker position={center}>
              <Popup>
                <div className="text-xs font-mono">
                  <div><strong>Lat:</strong> {gpsData!.latitude!.toFixed(6)}</div>
                  <div><strong>Lon:</strong> {gpsData!.longitude!.toFixed(6)}</div>
                  {typeof gpsData!.altitude === 'number' && (
                    <div><strong>Alt:</strong> {gpsData!.altitude.toFixed(1)} m</div>
                  )}
                  {typeof gpsData!.satellites === 'number' && (
                    <div><strong>Sats:</strong> {gpsData!.satellites}</div>
                  )}
                  {typeof gpsData!.hdop === 'number' && (
                    <div><strong>HDOP:</strong> {gpsData!.hdop.toFixed(2)}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {!hasFix && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-dark-bg/40 backdrop-blur-[1px]">
          <div className="rounded-lg bg-dark-card/90 px-4 py-3 text-center shadow-lg">
            <p className="font-medium text-dark-text">Chưa có tín hiệu GPS</p>
            <p className="text-xs text-dark-muted">
              {gpsData?.connected
                ? `Đang chờ fix… (sats: ${gpsData.satellites ?? 0})`
                : 'Module NEO-6M chưa kết nối'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
