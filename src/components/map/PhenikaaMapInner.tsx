'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Circle,
  Marker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, {
  type LatLngBoundsExpression,
  type LatLngExpression,
  type Map as LMap,
} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPSData } from '@/lib/mqtt-config';
import {
  PHENIKAA_BBOX,
  PHENIKAA_BOUNDARY,
  PHENIKAA_CENTER,
} from '@/lib/phenikaa-boundary';

const BOUNDARY_LATLNG: LatLngExpression[] = PHENIKAA_BOUNDARY.map(
  ([lat, lng]) => [lat, lng] as LatLngExpression,
);

const BOUNDS_PAD = 0.004;
const MAX_BOUNDS: LatLngBoundsExpression = [
  [PHENIKAA_BBOX.minLat - BOUNDS_PAD, PHENIKAA_BBOX.minLon - BOUNDS_PAD],
  [PHENIKAA_BBOX.maxLat + BOUNDS_PAD, PHENIKAA_BBOX.maxLon + BOUNDS_PAD],
];

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_SUBDOMAINS = ['a', 'b', 'c'];
const TILE_ATTRIB =
  '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('kp-mobile-leaflet-styles')) return;
  const style = document.createElement('style');
  style.id = 'kp-mobile-leaflet-styles';
  style.textContent = `
    @keyframes kp-robot-ping { 0% { transform: scale(0.6); opacity: 0.85; } 100% { transform: scale(1.7); opacity: 0; } }
    @keyframes kp-route-dash { to { stroke-dashoffset: -20; } }
    .kp-mobile-leaflet { position: relative; }
    .kp-mobile-leaflet .leaflet-container {
      background: #f4f1ec;
      font-family: inherit;
    }
    .kp-mobile-leaflet .leaflet-control-attribution {
      background: rgba(255,255,255,0.85);
      font-size: 10px;
    }
    .kp-mobile-leaflet .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.96);
      color: #f1f5f9;
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .kp-mobile-leaflet .leaflet-popup-content { margin: 8px 12px; font-size: 12px; }
    .kp-mobile-leaflet .leaflet-popup-tip { display: none; }
    .kp-mobile-leaflet .leaflet-popup-close-button { color: #f1f5f9; }
    .kp-route-flow { animation: kp-route-dash 1.4s linear infinite; }
    .kp-robot-icon { position: relative; width: 44px; height: 44px; }
    .kp-robot-icon .ping {
      position: absolute; inset: 0;
      border-radius: 50%;
      background: rgba(59,130,246,0.28);
      animation: kp-robot-ping 2.2s ease-out infinite;
    }
    .kp-robot-icon .ping.delay { inset: 8px; background: rgba(59,130,246,0.42); animation-delay: 0.55s; }
    .kp-robot-icon .core {
      position: absolute; left: 50%; top: 50%;
      width: 18px; height: 18px;
      margin: -9px 0 0 -9px;
      border-radius: 50%;
      background: linear-gradient(135deg,#60a5fa,#2563eb);
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(59,130,246,0.65),0 0 0 1px rgba(255,255,255,0.4);
    }
    .kp-waypoint-icon {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);
}

const ROBOT_ICON = (() => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div class="kp-robot-icon"><span class="ping"></span><span class="ping delay"></span><span class="core"></span></div>`,
    className: 'kp-robot-divicon',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
})();

function waypointIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="kp-waypoint-icon" style="background:${color}">${label}</div>`,
    className: 'kp-waypoint-divicon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

interface Props {
  gpsData?: GPSData | null;
  waypoints?: Waypoint[];
  onMapClick?: (lat: number, lng: number) => void;
  onWaypointDragEnd?: (id: string, lat: number, lng: number) => void;
  onWaypointDelete?: (id: string) => void;
  showRoadNetwork?: boolean;
  followRobot?: boolean;
  height?: string;
  initialZoom?: number;
  className?: string;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FollowRobot({
  lat,
  lng,
  enabled,
}: {
  lat?: number;
  lng?: number;
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.6 });
  }, [lat, lng, enabled, map]);
  return null;
}

function InitialFit({
  hasFix,
}: {
  hasFix: boolean;
}) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || hasFix) return;
    fitted.current = true;
    const bounds = L.latLngBounds(
      [PHENIKAA_BBOX.minLat, PHENIKAA_BBOX.minLon],
      [PHENIKAA_BBOX.maxLat, PHENIKAA_BBOX.maxLon],
    );
    map.fitBounds(bounds, { padding: [50, 50], animate: false });
  }, [hasFix, map]);
  return null;
}

export default function PhenikaaMapInner({
  gpsData,
  waypoints = [],
  onMapClick,
  onWaypointDragEnd,
  onWaypointDelete,
  showRoadNetwork = false,
  followRobot = true,
  height = '100%',
  initialZoom = 17,
  className = '',
}: Props) {
  const [roadGeo, setRoadGeo] = useState<any>(null);
  const mapRef = useRef<LMap | null>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (!showRoadNetwork) return;
    fetch('/maps/phenikaa.geojson')
      .then((r) => r.json())
      .then(setRoadGeo)
      .catch((err) => console.warn('[PhenikaaMap] geojson load failed:', err));
  }, [showRoadNetwork]);

  const hasFix = !!(
    gpsData?.connected &&
    typeof gpsData.latitude === 'number' &&
    typeof gpsData.longitude === 'number' &&
    Number.isFinite(gpsData.latitude) &&
    Number.isFinite(gpsData.longitude)
  );

  const robotLatLng = hasFix
    ? { lat: gpsData!.latitude as number, lng: gpsData!.longitude as number }
    : null;

  const accuracyRadius = useMemo(() => {
    if (!gpsData?.hdop || gpsData.hdop <= 0) return 5;
    return Math.max(2, Math.min(50, gpsData.hdop * 2.5));
  }, [gpsData?.hdop]);

  const routePositions = useMemo<LatLngExpression[]>(
    () => waypoints.map((wp) => [wp.lat, wp.lng] as LatLngExpression),
    [waypoints],
  );

  const roadStyle = (feature?: any) => {
    const hw = feature?.properties?.highway;
    const isMajor = hw && ['primary', 'secondary', 'tertiary', 'trunk'].includes(hw);
    return isMajor
      ? { color: '#0ea5e9', weight: 3, opacity: 0.85 }
      : { color: '#64748b', weight: 1.6, opacity: 0.8 };
  };

  return (
    <div className={`kp-mobile-leaflet ${className}`} style={{ height, position: 'relative' }}>
      <MapContainer
        center={[
          robotLatLng?.lat ?? PHENIKAA_CENTER[0],
          robotLatLng?.lng ?? PHENIKAA_CENTER[1],
        ]}
        zoom={initialZoom}
        minZoom={16}
        maxZoom={19}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        preferCanvas
        style={{ width: '100%', height: '100%' }}
        ref={(m: LMap | null) => {
          mapRef.current = m;
        }}
      >
        <TileLayer
          url={TILE_URL}
          subdomains={TILE_SUBDOMAINS}
          attribution={TILE_ATTRIB}
          maxZoom={19}
          detectRetina
        />

        <MapClickHandler onMapClick={onMapClick} />
        <InitialFit hasFix={hasFix} />
        <FollowRobot
          lat={robotLatLng?.lat}
          lng={robotLatLng?.lng}
          enabled={followRobot}
        />

        {/* Optional campus road network overlay (off by default) */}
        {showRoadNetwork && roadGeo && (
          <GeoJSON data={roadGeo} style={roadStyle as any} />
        )}

        {/* Boundary — red outline + soft orange fill, OSM tiles untouched outside */}
        <Polygon
          positions={BOUNDARY_LATLNG}
          pathOptions={{
            color: '#dc2626',
            weight: 3,
            opacity: 1,
            fillColor: '#fb923c',
            fillOpacity: 0.22,
          }}
        />

        {/* Patrol route */}
        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#0ea5e9',
              weight: 4,
              opacity: 0.9,
              dashArray: '8 5',
              className: 'kp-route-flow',
            }}
          />
        )}

        {/* Accuracy ring */}
        {robotLatLng && (
          <Circle
            center={[robotLatLng.lat, robotLatLng.lng]}
            radius={accuracyRadius}
            pathOptions={{
              color: '#3b82f6',
              weight: 1,
              opacity: 0.6,
              fillColor: '#3b82f6',
              fillOpacity: 0.12,
            }}
          />
        )}

        {/* Robot */}
        {robotLatLng && ROBOT_ICON && (
          <Marker position={[robotLatLng.lat, robotLatLng.lng]} icon={ROBOT_ICON}>
            <Popup closeButton={false}>
              <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                <div><strong>KPatrol Robot</strong></div>
                <div>Lat: {gpsData!.latitude!.toFixed(6)}</div>
                <div>Lon: {gpsData!.longitude!.toFixed(6)}</div>
                {typeof gpsData!.satellites === 'number' && (
                  <div>Sats: {gpsData!.satellites}</div>
                )}
                {typeof gpsData!.hdop === 'number' && (
                  <div>HDOP: {gpsData!.hdop.toFixed(2)}</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Waypoints */}
        {waypoints.map((wp, idx) => {
          const isStart = idx === 0;
          const isEnd = idx === waypoints.length - 1 && idx !== 0;
          const color = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#0ea5e9';
          const icon = waypointIcon(color, String(idx + 1));
          return (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={icon}
              draggable={!!onWaypointDragEnd}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onWaypointDragEnd?.(wp.id, ll.lat, ll.lng);
                },
              }}
            >
              <Popup closeButton={false}>
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>
                    Điểm {idx + 1}
                    {isStart && ' (xuất phát)'}
                    {isEnd && ' (kết thúc)'}
                  </div>
                  {wp.label && <div>{wp.label}</div>}
                  <div style={{ fontFamily: 'monospace', marginTop: 4 }}>
                    {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                  </div>
                  {onWaypointDelete && (
                    <button
                      onClick={() => onWaypointDelete(wp.id)}
                      style={{
                        marginTop: 6,
                        padding: '4px 10px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Xoá điểm này
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
