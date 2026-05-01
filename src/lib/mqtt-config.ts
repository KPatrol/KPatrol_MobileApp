// MQTT Configuration for K-Patrol Robot
// Connection to VPS MQTT Broker

export const MQTT_CONFIG = {
  // Connection settings
  host: process.env.NEXT_PUBLIC_MQTT_HOST ?? '103.81.84.43',
  port: Number(process.env.NEXT_PUBLIC_MQTT_PORT ?? 1883),
  wsPort: Number(process.env.NEXT_PUBLIC_MQTT_WS_PORT ?? 8083),
  protocol: 'mqtt',     // 'mqtt' for TCP, 'ws' for WebSocket

  // Authentication
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME ?? 'alphaasimov2024',
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD ?? 'gvB3DtGfus6U',

  // Client options
  clientId: `kpatrol_web_${Math.random().toString(16).slice(2, 10)}`,
  keepalive: 60,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 30000,

  // Quality of Service
  qos: 1 as const,
};

/**
 * Topic prefix for a robot: "kpatrol/{serial}"
 * All topics follow this structure to isolate per-robot messages.
 */
export const TOPIC_PREFIX = (serial: string) => `kpatrol/${serial}`;

/**
 * Build the full MQTT topics object for a given robot serial.
 *
 * Pattern: kpatrol/{serial}/{subtopic}
 *
 * Usage:
 *   const T = getTopics('KPATROL-001');
 *   client.subscribe(T.STATUS);   // → "kpatrol/KPATROL-001/status"
 *   client.publish(T.COMMAND, payload);
 */
export function getTopics(serial: string) {
  const p = `kpatrol/${serial}`;
  return {
    // Commands: Web → Pi
    COMMAND:       `${p}/command`,
    SPEED:         `${p}/speed`,
    MODE:          `${p}/mode`,
    EMERGENCY:     `${p}/emergency`,
    MOTOR:         `${p}/motor`,
    LIGHT:         `${p}/light`,
    MAIN_LIGHT:    `${p}/main_light`,

    // Status: Pi → Web
    STATUS:        `${p}/status`,
    POSITION:      `${p}/position`,
    SENSORS:       `${p}/sensors`,
    MOTORS:        `${p}/motors`,
    ENCODERS:      `${p}/encoders`,
    BATTERY:       `${p}/battery`,
    GPS:           `${p}/gps`,

    // System
    HEARTBEAT:     `${p}/heartbeat`,
    LOG:           `${p}/log`,
    ERROR:         `${p}/error`,

    // Camera
    CAMERA_COMMAND: `${p}/camera/command`,
    CAMERA_STATUS:  `${p}/camera/status`,

    // V3: Safety & IMU
    SAFETY:        `${p}/safety`,
    SAFETY_CONFIG: `${p}/safety_config`,
    IMU:           `${p}/imu`,

    // V5.3: Autonomous Navigation (5 modes)
    NAV_COMMAND:   `${p}/nav_command`,
    NAV_STATUS:    `${p}/nav_status`,
    GPS_ROUTE:     `${p}/gps_route`,
    GPS_STATUS:    `${p}/gps_status`,
    BUZZ:          `${p}/buzzer`,
    LIGHT_PATTERN: `${p}/light_pattern`,

    // V7: ArUco Markers (camera-stream → Pi)
    MARKERS:       `${p}/markers`,

    // V10: AI Anomaly Detection (person / fire / motion)
    ALERT:         `${p}/alert`,
  } as const;
}

export type RobotTopics = ReturnType<typeof getTopics>;

/**
 * Wildcard pattern to subscribe to ALL topics of a robot at once.
 * kpatrol/{serial}/# — useful for logging / debugging.
 */
export const getRobotWildcard = (serial: string) => `kpatrol/${serial}/#`;

/**
 * Extract the serial number from a topic string.
 * "kpatrol/KPATROL-001/status" → "KPATROL-001"
 * Returns null if the topic doesn't match the pattern.
 */
export function parseTopicSerial(topic: string): string | null {
  const m = topic.match(/^kpatrol\/([^/]+)\//);
  return m ? m[1] : null;
}

/**
 * Extract the subtopic suffix from a full topic.
 * "kpatrol/KPATROL-001/nav_status" → "nav_status"
 */
export function parseTopicSuffix(topic: string): string {
  const parts = topic.split('/');
  return parts.slice(2).join('/'); // everything after kpatrol/{serial}
}

// ---------------------------------------------------------------------------
// Legacy alias — kept for any components that still import MQTT_TOPICS directly.
// Points to a default KPATROL-001 instance. Prefer getTopics() in new code.
// ---------------------------------------------------------------------------
export const MQTT_TOPICS = getTopics(
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ROBOT_SERIAL) || 'KPATROL-001'
);

// V5.3: Autonomous Navigation — 5 modes (MANUAL + 3 AUTO + EMERGENCY)
export type NavMode =
  | 'MANUAL'
  | 'AUTO_FREE_COVERAGE'
  | 'AUTO_LINE_FOLLOW'
  | 'AUTO_GPS_WAYPOINT'
  | 'EMERGENCY';

// V5.3: Navigation status from robot
export interface NavStatus {
  mode: NavMode;
  speed?: number;                    // Nav speed percent (0-100)
  state?: 'idle' | 'running' | 'paused' | 'emergency' | 'done';
  // GPS waypoint progress (only present in AUTO_GPS_WAYPOINT)
  current_waypoint?: number;
  total_waypoints?: number;
  distance_remaining_m?: number;
  bearing_deg?: number;
  error?: string;
  timestamp?: number;
}

// V5.3: GPS Waypoint definitions
export interface GPSWaypoint {
  lat: number;
  lon: number;
  radius_m?: number;     // arrival radius (default 3 m)
  speed_pct?: number;    // optional per-waypoint speed override
  label?: string;
}

export type GPSRouteAction = 'set' | 'start' | 'stop';

export interface GPSRouteCommand {
  action: GPSRouteAction;
  waypoints?: GPSWaypoint[];   // required when action === 'set'
  loop?: boolean;
  timestamp?: number;
}

export interface GPSStatusPayload {
  ok?: boolean;
  action?: string;
  count?: number;
  state?: string;
  error?: string;
  timestamp?: number;
}

// V5.3: Buzzer + Light patterns (firmware-side state machines)
export type BuzzerPattern = 'OFF' | 'ON' | 'BEEP' | 'ALARM' | 'SOS';
export type LightPattern  =
  | 'OFF'
  | 'WARN_BLINK'
  | 'WARN_STROBE'
  | 'BOTH_BLINK'
  | 'SOS';

export interface BuzzerCommand {
  pattern: BuzzerPattern;
  timestamp?: number;
}

export interface LightPatternCommand {
  pattern: LightPattern;
  timestamp?: number;
}

// Motor positions (K-Patrol layout)
export type MotorPosition = 'FR' | 'FL' | 'BR' | 'BL';

// Command Types - matches ESP32-S3 serial protocol
export type CommandType = 
  // Movement commands
  | 'F'       // Forward
  | 'B'       // Backward
  | 'SL'      // Strafe Left
  | 'SR'      // Strafe Right
  | 'L'       // Rotate Left (CCW)
  | 'R'       // Rotate Right (CW)
  | 'DL'      // Diagonal Forward-Left
  | 'DR'      // Diagonal Forward-Right
  | 'S'       // Stop (Brake)
  // Individual motor commands
  | 'FR_F' | 'FR_B' | 'FR_S'  // Front-Right
  | 'FL_F' | 'FL_B' | 'FL_S'  // Front-Left
  | 'BR_F' | 'BR_B' | 'BR_S'  // Back-Right
  | 'BL_F' | 'BL_B' | 'BL_S'  // Back-Left
  // Warning Light control (Đèn cảnh báo)
  | 'LIGHT_ON' | 'LIGHT_OFF' | 'LIGHT_T'
  // Main Light control (Đèn chính)
  | 'MAIN_ON' | 'MAIN_OFF' | 'MAIN_T';

export interface MQTTCommand {
  type: CommandType;
  speed?: number;       // 0-255
  timestamp: number;
}

export interface EncoderData {
  motor: MotorPosition;
  count: number;
  revolutions: number;
  rpm: number;
}

export interface MQTTEncoders {
  FR: EncoderData;
  FL: EncoderData;
  BR: EncoderData;
  BL: EncoderData;
  timestamp: number;
}

export interface MotorData {
  position: MotorPosition;
  speed: number;        // 0-255
  direction: 'forward' | 'backward' | 'stopped';
  inverted: boolean;
}

export interface MQTTMotors {
  FR: MotorData;
  FL: MotorData;
  BR: MotorData;
  BL: MotorData;
  timestamp: number;
}

export interface MQTTStatus {
  connected: boolean;
  esp32_motor: boolean;   // /dev/ttyACM0
  esp32_encoder: boolean; // /dev/ttyUSB0
  battery: number;
  speed: number;          // Current speed setting (0-255)
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  lightState: boolean;     // Warning light state (Đèn cảnh báo - GPIO 38)
  mainLightState: boolean; // Main light state (Đèn chính - GPIO 39)
  motors: MQTTMotors;
  encoders: MQTTEncoders;
  position: {
    x: number;
    y: number;
    heading: number;
  };
  timestamp: number;
}

export interface MQTTHeartbeat {
  clientId: string;
  status: 'online' | 'offline';
  timestamp: number;
}

// Movement direction mapping for Mecanum
export const MECANUM_MOVEMENTS: Record<string, { FR: number; FL: number; BR: number; BL: number }> = {
  'F':  { FR: 1,  FL: 1,  BR: 1,  BL: 1  },  // Forward
  'B':  { FR: -1, FL: -1, BR: -1, BL: -1 },  // Backward
  'SR': { FR: -1, FL: 1,  BR: 1,  BL: -1 },  // Strafe Right
  'SL': { FR: 1,  FL: -1, BR: -1, BL: 1  },  // Strafe Left
  'R':  { FR: -1, FL: 1,  BR: -1, BL: 1  },  // Rotate Right (CW)
  'L':  { FR: 1,  FL: -1, BR: 1,  BL: -1 },  // Rotate Left (CCW)
  'DR': { FR: 0,  FL: 1,  BR: 1,  BL: 0  },  // Diagonal Forward-Right
  'DL': { FR: 1,  FL: 0,  BR: 0,  BL: 1  },  // Diagonal Forward-Left
  'S':  { FR: 0,  FL: 0,  BR: 0,  BL: 0  },  // Stop
};

// V3: Safety Zone Types
export type SafetyZone = 'safe' | 'slow' | 'caution' | 'danger';

// V3: ToF Sensor Data
export interface ToFData {
  front: number;
  front_left: number;
  front_right: number;
  left: number;
  right: number;
  back: number;
  timestamp: number;
}

// V5: Per-direction safety info
export interface DirectionSafety {
  zone: SafetyZone;
  distance: number;
  blocked: boolean;
}

// V3/V5: Safety Status (V5 adds 'directions' field)
export interface SafetyStatus {
  enabled: boolean;
  zone: SafetyZone;
  speed_multiplier: number;
  min_distance: number;
  tof: ToFData;
  thresholds: {
    danger: number;
    caution: number;
    slow: number;
  };
  // V5: Per-direction safety zones
  directions?: {
    forward: DirectionSafety;
    backward: DirectionSafety;
    left: DirectionSafety;
    right: DirectionSafety;
  };
  timestamp: number;
}

// V3: IMU Data
export interface IMUData {
  yaw: number;
  pitch: number;
  roll: number;
  accuracy: number;
  timestamp: number;
}

// V3: Safety Config Command
export interface SafetyConfigCommand {
  enabled?: boolean;
  danger_distance?: number;
  caution_distance?: number;
  slow_distance?: number;
  timestamp: number;
}

// ── Sensors ──────────────────────────────────────────────────────────────────
// Payload published by Pi on T.SENSORS
export interface SensorsData {
  tof: ToFData;
  temperature?: number;   // CPU/ambient temperature
  humidity?: number;
  timestamp: number;
}

// ── Camera ───────────────────────────────────────────────────────────────────
// Status published by Pi on T.CAMERA_STATUS
export interface CameraStatus {
  active: boolean;         // Camera process running
  streaming: boolean;      // Stream being sent
  resolution?: string;     // e.g. "640x480"
  fps?: number;
  clients?: number;        // Connected WebRTC/stream clients
  timestamp: number;
}

// Command sent from web to Pi on T.CAMERA_COMMAND
export interface CameraCommand {
  action: 'start' | 'stop' | 'snapshot' | 'restart';
  resolution?: string;
  fps?: number;
  quality?: number;        // JPEG quality 0-100
  timestamp: number;
}

// ── ArUco Markers ─────────────────────────────────────────────────────────────
// V7: Detected marker data published by camera-stream on T.MARKERS
export interface MarkerData {
  id: number;              // ArUco marker ID
  distance?: number;       // Estimated distance in meters
  angle?: number;          // Horizontal angle from center (degrees)
  corners?: number[][];    // 4 corner points [[x,y], ...]
  center?: { x: number; y: number };
}

export interface MarkersPayload {
  markers: MarkerData[];
  count: number;
  timestamp: number;
}

// ── V5.2: Outdoor GPS (NEO-6M) ───────────────────────────────────────────────
// Payload published by Pi on T.GPS — matches GPSReader output schema.
// Fix quality: 0=invalid, 1=GPS, 2=DGPS, 4=RTK fixed, 5=RTK float.
// Fix type:    1=no fix, 2=2D, 3=3D.
export interface GPSData {
  connected: boolean;          // GPS module reachable + parsing NMEA
  latitude: number | null;     // decimal degrees, signed (+N / -S)
  longitude: number | null;    // decimal degrees, signed (+E / -W)
  altitude?: number | null;    // metres above MSL
  satellites?: number;         // number of satellites in use
  hdop?: number;               // horizontal dilution of precision (lower = better)
  speed?: number;              // ground speed (m/s or km/h depending on Pi config)
  course?: number;             // course over ground in degrees (0..360)
  fix_quality?: number;        // GGA fix quality flag
  fix_type?: number;           // GSA fix type
  timestamp_ms?: number;       // Pi-side wall clock at last NMEA update
  timestamp?: number;          // alias used by some downstream code
}

// ── V10: AI Anomaly Detection ────────────────────────────────────────────────
// Payload published by detection/alert_bridge.py on T.ALERT
export type DetectionKind = 'person' | 'fire' | 'motion';

export interface DetectionAlert {
  kind: DetectionKind;
  confidence: number;           // 0..1
  bbox: [number, number, number, number];  // [x, y, w, h] in pixels
  ts: number;                   // Unix timestamp (seconds, float)
  snapshot: string;             // Relative path saved on Pi, e.g. "snapshots/1719000000_person.jpg"
  robot: string;                // Robot serial
  frame_size?: [number, number]; // [width, height]
  // Inline base64-encoded JPEG (~25–40 KB at 320×240 q60). Empty/missing
  // when the Pi runs without cv2 or when inline snapshots are disabled.
  // Render with: src={`data:image/jpeg;base64,${snapshot_b64}`}
  snapshot_b64?: string;
  id?: number;                  // AlertStore row id, -1 when not persisted
}
