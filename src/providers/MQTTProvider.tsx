'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import {
  MQTT_CONFIG,
  getTopics,
  getRobotWildcard,
  RobotTopics,
  CommandType,
  MQTTCommand,
  MQTTStatus,
  MQTTHeartbeat,
  MQTTEncoders,
  MQTTMotors,
  MotorPosition,
  SafetyStatus,
  IMUData,
  SafetyConfigCommand,
  NavStatus,
  NavMode,
  GPSWaypoint,
  GPSRouteAction,
  GPSRouteCommand,
  GPSStatusPayload,
  BuzzerPattern,
  LightPattern,
  SensorsData,
  CameraStatus,
  CameraCommand,
  MarkersPayload,
  MarkerData,
  DetectionAlert,
  GPSData,
} from '@/lib/mqtt-config';
import { useRobotStore } from '@/store/robotStore';
import { robotEventsApi } from '@/lib/api';
import { useRobotContext } from './RobotProvider';

// Types
interface MQTTContextValue {
  isConnected: boolean;
  isRobotOnline: boolean;
  isMotorControllerOnline: boolean;
  isEncoderReaderOnline: boolean;
  robotStatus: MQTTStatus | null;
  encoders: MQTTEncoders | null;
  motors: MQTTMotors | null;
  lastHeartbeat: number | null;
  connectionError: string | null;
  currentSpeed: number;
  lightState: boolean;        // Warning Light (Đèn cảnh báo)
  mainLightState: boolean;    // Main Light (Đèn chính)

  // V3: Safety & IMU
  safetyStatus: SafetyStatus | null;
  imuData: IMUData | null;
  safetyEnabled: boolean;

  // V5.3: Autonomous navigation (5 modes)
  navStatus: NavStatus | null;
  gpsStatus: GPSStatusPayload | null;
  gpsRoute: GPSWaypoint[];        // last route sent to robot
  buzzerPattern: BuzzerPattern;   // last pattern requested
  lightPattern: LightPattern;     // last pattern requested

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendCommand: (command: CommandType, speed?: number) => void;
  sendMotorCommand: (motor: MotorPosition, direction: 'F' | 'B' | 'S') => void;
  setSpeed: (speed: number) => void;
  emergencyStop: () => void;
  resetEncoders: () => void;
  setLight: (state: boolean) => void;        // Warning Light
  toggleLight: () => void;                   // Warning Light
  setMainLight: (state: boolean) => void;    // Main Light
  toggleMainLight: () => void;               // Main Light

  // V3: Safety Actions
  setSafetyEnabled: (enabled: boolean) => void;
  toggleSafety: () => void;

  // V5.3: Navigation actions
  sendNavCommand: (mode: NavMode | string, options?: Record<string, any>) => void;
  sendGpsRoute: (action: GPSRouteAction, waypoints?: GPSWaypoint[], opts?: { loop?: boolean }) => void;
  sendBuzzerPattern: (pattern: BuzzerPattern) => void;
  sendLightPattern: (pattern: LightPattern) => void;

  // V10: AI Anomaly Detection
  detectionAlerts: DetectionAlert[];
  clearDetectionAlerts: () => void;

  // V5.2: Outdoor GPS (NEO-6M)
  gpsData: GPSData | null;

  // Camera
  sendCameraCommand: (action: CameraCommand['action'], options?: Partial<Omit<CameraCommand, 'action' | 'timestamp'>>) => void;

  // Sensor + Camera + Marker states
  sensorsData: SensorsData | null;
  cameraStatus: CameraStatus | null;
  markersData: MarkerData[];

  // Utility
  publish: (topic: string, message: string | object) => void;
}

const MQTTContext = createContext<MQTTContextValue | null>(null);

interface MQTTProviderProps {
  children: ReactNode;
}

export function MQTTProvider({ children }: MQTTProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRobotOnline, setIsRobotOnline] = useState(false);
  const [isMotorControllerOnline, setIsMotorControllerOnline] = useState(false);
  const [isEncoderReaderOnline, setIsEncoderReaderOnline] = useState(false);
  const [robotStatus, setRobotStatus] = useState<MQTTStatus | null>(null);
  const [encoders, setEncoders] = useState<MQTTEncoders | null>(null);
  const [motors, setMotors] = useState<MQTTMotors | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentSpeedState, setCurrentSpeedState] = useState(150);
  const [lightState, setLightState] = useState(false);         // Warning Light
  const [mainLightState, setMainLightState] = useState(false); // Main Light

  // V3: Safety & IMU state
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [imuData, setImuData] = useState<IMUData | null>(null);
  const [safetyEnabled, setSafetyEnabledState] = useState(true);

  // V5.3: Autonomous navigation state
  const [navStatus, setNavStatus] = useState<NavStatus | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GPSStatusPayload | null>(null);
  const [gpsRoute, setGpsRoute] = useState<GPSWaypoint[]>([]);
  const [buzzerPattern, setBuzzerPattern] = useState<BuzzerPattern>('OFF');
  const [lightPattern, setLightPattern] = useState<LightPattern>('OFF');

  // Sensors, Camera, Markers states
  const [sensorsData, setSensorsData] = useState<SensorsData | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [markersData, setMarkersData] = useState<MarkerData[]>([]);

  // V10: AI anomaly detection — rolling buffer of latest 50 alerts
  const [detectionAlerts, setDetectionAlerts] = useState<DetectionAlert[]>([]);

  // V5.2: Outdoor GPS (NEO-6M)
  const [gpsData, setGpsData] = useState<GPSData | null>(null);

  const clientRef = useRef<any>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeed = useRef<number>(150);
  // Current robot serial — drives topic routing
  const topicsRef = useRef<RobotTopics>(getTopics('KPATROL-001'));

  // Pull selected robot serial from RobotProvider
  const { selectedRobot } = useRobotContext();
  const activeSerial = selectedRobot?.serialNumber ?? 'KPATROL-001';
  // Keep a ref so async callbacks (connect, re-subscribe) always read latest serial
  const activeSerialRef = useRef<string>(activeSerial);

  // Recompute topics whenever serial changes
  useEffect(() => {
    activeSerialRef.current = activeSerial;
    topicsRef.current = getTopics(activeSerial);
  }, [activeSerial]);

  // Connect to MQTT broker
  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Dynamic import mqtt library
      const mqttModule = await import('mqtt');
      const mqtt = mqttModule.default || mqttModule;

      // Use WSS same-origin when page is HTTPS to avoid mixed-content block
      const isHttps = window.location.protocol === 'https:';
      const wsUrl = isHttps
        ? `wss://${window.location.host}/mqtt`
        : `ws://${MQTT_CONFIG.host}:${MQTT_CONFIG.wsPort}/mqtt`;

      console.log('[MQTT] Connecting to:', wsUrl);

      // Handle different mqtt.js export formats
      const connectFn = mqtt.connect || (mqtt as any).default?.connect;
      if (!connectFn) {
        throw new Error('MQTT connect function not found');
      }

      const client = connectFn(wsUrl, {
        clientId: MQTT_CONFIG.clientId,
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        keepalive: MQTT_CONFIG.keepalive,
        clean: MQTT_CONFIG.clean,
        reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
        connectTimeout: MQTT_CONFIG.connectTimeout,
        protocolVersion: 4, // MQTT 3.1.1
      });

      clientRef.current = client;

      client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe using wildcard for the active robot: kpatrol/{serial}/#
        const serial = activeSerialRef.current;
        const wildcard = getRobotWildcard(serial);
        client.subscribe(wildcard, { qos: MQTT_CONFIG.qos }, (err: any) => {
          if (err) {
            console.error(`[MQTT] Subscribe error for ${wildcard}:`, err);
          } else {
            console.log(`[MQTT] Subscribed to ${wildcard}`);
          }
        });

        // Send online status
        const T = topicsRef.current;
        const heartbeat: MQTTHeartbeat = {
          clientId: MQTT_CONFIG.clientId,
          status: 'online',
          timestamp: Date.now(),
        };
        client.publish(T.HEARTBEAT, JSON.stringify(heartbeat));
      });

      client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString());
          handleMessage(topic, payload, topicsRef.current);
        } catch (e) {
          console.warn('[MQTT] Failed to parse message:', message.toString());
        }
      });

      client.on('error', (error: any) => {
        console.error('[MQTT] Connection error:', error);
        setConnectionError(error.message || 'Connection failed');
      });

      client.on('close', () => {
        console.log('[MQTT] Connection closed');
        setIsConnected(false);
      });

      client.on('offline', () => {
        console.log('[MQTT] Client offline');
        setIsConnected(false);
      });

      client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

    } catch (error: any) {
      console.error('[MQTT] Failed to initialize:', error);
      setConnectionError(error.message || 'Failed to initialize MQTT');
    }
  }, []);

  // Re-subscribe when robot serial changes (while already connected)
  const prevSerialRef = useRef<string>(activeSerial);
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !isConnected) return;
    const oldWildcard = getRobotWildcard(prevSerialRef.current);
    const newWildcard = getRobotWildcard(activeSerial);
    if (oldWildcard === newWildcard) return;

    client.unsubscribe(oldWildcard, (err: any) => {
      if (err) console.warn(`[MQTT] Unsubscribe error for ${oldWildcard}:`, err);
      else console.log(`[MQTT] Unsubscribed from ${oldWildcard}`);
    });

    client.subscribe(newWildcard, { qos: MQTT_CONFIG.qos }, (err: any) => {
      if (err) console.error(`[MQTT] Subscribe error for ${newWildcard}:`, err);
      else console.log(`[MQTT] Re-subscribed to ${newWildcard}`);
    });

    // Reset per-robot caches — UI state must clear on robot switch so we don't
    // render stale ON/OFF from the previous robot before its first STATUS arrives.
    setNavStatus(null);
    setGpsStatus(null);
    setGpsRoute([]);
    setBuzzerPattern('OFF');
    setLightPattern('OFF');
    setLightState(false);
    setMainLightState(false);
    setRobotStatus(null);

    prevSerialRef.current = activeSerial;
  }, [activeSerial, isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle incoming messages — bridges MQTT → Zustand store + backend API
  const handleMessage = useCallback((topic: string, payload: any, T: RobotTopics) => {
    // Helper: log event to local store + backend API (fire-and-forget)
    const logEvent = (
      eventType: 'movement' | 'alert' | 'system' | 'patrol' | 'connection' | 'error' | 'safety' | 'navigation',
      title: string,
      description: string,
      severity: 'info' | 'success' | 'warning' | 'error' = 'info',
      data?: Record<string, any>,
    ) => {
      useRobotStore.getState().addHistoryItem({ type: eventType as any, title, description, details: data });
      robotEventsApi.log({ eventType, title, description, severity, data });
    };

    const logAlert = (
      type: 'info' | 'warning' | 'error' | 'success',
      title: string,
      message: string,
    ) => {
      useRobotStore.getState().addAlert({ type, title, message });
    };

    switch (topic) {
      case T.HEARTBEAT:
        setLastHeartbeat(Date.now());
        if (payload.clientId?.startsWith('kpatrol_pi')) {
          const wasOnline = isRobotOnline;
          const nowOnline = payload.status === 'online';
          setIsRobotOnline(nowOnline);

          if (payload.esp32_motor !== undefined) setIsMotorControllerOnline(payload.esp32_motor);
          if (payload.esp32_encoder !== undefined) setIsEncoderReaderOnline(payload.esp32_encoder);

          if (!wasOnline && nowOnline) {
            logEvent('connection', 'Robot kết nối', 'Pi đã kết nối với MQTT broker', 'success', { clientId: payload.clientId });
            logAlert('success', 'Robot Online', 'Robot K-Patrol đã kết nối thành công');
          } else if (wasOnline && !nowOnline) {
            logEvent('connection', 'Robot mất kết nối', 'Pi đã ngắt kết nối MQTT broker', 'warning');
            logAlert('warning', 'Robot Offline', 'Mất kết nối với robot');
          }

          if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = setTimeout(() => {
            setIsRobotOnline(false);
            setIsMotorControllerOnline(false);
            setIsEncoderReaderOnline(false);
            logEvent('connection', 'Heartbeat timeout', 'Không nhận được heartbeat từ robot trong 10 giây', 'error');
            logAlert('error', 'Mất tín hiệu Robot', 'Không nhận được phản hồi từ robot trong 10 giây');
          }, 10000);
        }
        break;

      case T.STATUS: {
        const status = payload as MQTTStatus;
        setRobotStatus(status);
        setIsRobotOnline(true);
        setIsMotorControllerOnline(status.esp32_motor ?? false);
        setIsEncoderReaderOnline(status.esp32_encoder ?? false);
        if (status.motors) setMotors(status.motors);
        if (status.encoders) setEncoders(status.encoders);
        if (status.lightState !== undefined) setLightState(status.lightState);
        if (status.mainLightState !== undefined) setMainLightState(status.mainLightState);
        if ((status as any).safety) {
          setSafetyStatus((status as any).safety);
          setSafetyEnabledState((status as any).safety.enabled ?? true);
        }
        if ((status as any).imu) setImuData((status as any).imu);
        if (status.battery !== undefined && status.battery < 20) {
          logAlert('warning', 'Pin yếu', `Pin robot chỉ còn ${status.battery}%`);
        }
        break;
      }

      case T.MOTORS:
        setMotors(payload as MQTTMotors);
        setRobotStatus(prev => prev ? { ...prev, motors: payload } : null);
        break;

      case T.ENCODERS:
        setEncoders(payload as MQTTEncoders);
        setRobotStatus(prev => prev ? { ...prev, encoders: payload } : null);
        break;

      // V5.2: Outdoor GPS (NEO-6M)
      case T.GPS: {
        const gps = payload as GPSData;
        setGpsData(gps);
        break;
      }

      case T.BATTERY:
        setRobotStatus(prev => prev ? { ...prev, battery: payload.level } : null);
        if (payload.level !== undefined && payload.level < 20) {
          logEvent('system', 'Pin yếu', `Dung lượng pin: ${payload.level}%`, 'warning', { battery: payload.level });
          logAlert('warning', 'Pin yếu', `Pin robot chỉ còn ${payload.level}%, hãy sạc sớm`);
        }
        break;

      case T.POSITION:
        setRobotStatus(prev => prev ? { ...prev, position: payload } : null);
        break;

      case T.LOG:
        console.log('[Robot Log]:', payload.message);
        if (payload.message) logEvent('system', 'Robot Log', payload.message, 'info', { raw: payload });
        break;

      case T.ERROR:
        console.error('[Robot Error]:', payload.message);
        if (payload.message) {
          logEvent('error', 'Lỗi hệ thống', payload.message, 'error', { raw: payload });
          logAlert('error', 'Lỗi Robot', payload.message);
        }
        break;

      // V3: Safety data
      case T.SAFETY: {
        const newSafety = payload as SafetyStatus;
        setSafetyStatus(newSafety);
        setSafetyEnabledState(newSafety.enabled ?? true);
        if (newSafety.zone === 'danger') {
          logEvent('safety', 'Vùng NGUY HIỂM', `Phát hiện vật cản cực gần: ${newSafety.min_distance}mm`, 'error', {
            zone: newSafety.zone, min_distance: newSafety.min_distance, tof: newSafety.tof,
          });
          logAlert('error', '🚨 Nguy hiểm - Vật cản!', `Phát hiện vật cản: ${newSafety.min_distance}mm - Robot đã dừng khẩn cấp`);
        } else if (newSafety.zone === 'caution') {
          logEvent('safety', 'Vùng THẬN TRỌNG', `Vật cản gần: ${newSafety.min_distance}mm, tốc độ 50%`, 'warning', {
            zone: newSafety.zone, min_distance: newSafety.min_distance,
          });
        }
        break;
      }

      // V3: IMU
      case T.IMU:
        setImuData(payload as IMUData);
        break;

      // Sensors (ToF distances + temperature)
      case T.SENSORS:
        setSensorsData(payload as SensorsData);
        break;

      // Camera status from Pi
      case T.CAMERA_STATUS:
        setCameraStatus(payload as CameraStatus);
        break;

      // V7: ArUco marker detections from camera-stream
      case T.MARKERS:
        if (Array.isArray((payload as MarkersPayload).markers)) {
          setMarkersData((payload as MarkersPayload).markers);
        }
        break;

      // V10: AI anomaly detection (person / fire / motion)
      case T.ALERT: {
        const alert = payload as DetectionAlert;
        if (!alert.kind) break;
        setDetectionAlerts(prev => [alert, ...prev].slice(0, 50));

        const kindLabel: Record<string, string> = {
          person: 'Phát hiện người',
          fire: 'Cảnh báo cháy',
          motion: 'Chuyển động bất thường',
        };
        const title = kindLabel[alert.kind] ?? `Phát hiện ${alert.kind}`;
        const pct = Math.round((alert.confidence ?? 0) * 100);
        const description = `${title} (${pct}% tin cậy) — ${alert.snapshot ?? 'không có ảnh'}`;
        const severity: 'info' | 'warning' | 'error' =
          alert.kind === 'fire' ? 'error' : alert.kind === 'person' ? 'warning' : 'info';

        logEvent('alert', title, description, severity, alert as any);
        logAlert(severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info', title, description);
        break;
      }

      // V5.3: Navigation status — current mode + GPS waypoint progress
      case T.NAV_STATUS: {
        const ns = payload as NavStatus;
        setNavStatus(ns);
        break;
      }

      // V5.3: GPS route action acknowledgment (set/start/stop)
      case T.GPS_STATUS: {
        const gs = payload as GPSStatusPayload;
        setGpsStatus(gs);
        if (gs.action && gs.ok === false && gs.error) {
          logAlert('error', `GPS route: ${gs.action}`, gs.error);
        }
        break;
      }

      default:
        break;
    }
  }, [isRobotOnline]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      const heartbeat: MQTTHeartbeat = {
        clientId: MQTT_CONFIG.clientId,
        status: 'offline',
        timestamp: Date.now(),
      };
      clientRef.current.publish(topicsRef.current.HEARTBEAT, JSON.stringify(heartbeat));
      clientRef.current.end();
      clientRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Publish message
  const publish = useCallback((topic: string, message: string | object) => {
    if (!clientRef.current || !isConnected) {
      console.warn('[MQTT] Cannot publish: not connected');
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    clientRef.current.publish(topic, payload, { qos: MQTT_CONFIG.qos });
  }, [isConnected]);

  // Send movement command
  const sendCommand = useCallback((command: CommandType, speed?: number) => {
    const mqttCommand: MQTTCommand = {
      type: command,
      speed: speed ?? currentSpeed.current,
      timestamp: Date.now(),
    };

    publish(topicsRef.current.COMMAND, mqttCommand);
    console.log('[MQTT] Command sent:', mqttCommand);

    const movementLabels: Partial<Record<CommandType, string>> = {
      F: 'Tiến thẳng', B: 'Lùi', SL: 'Trượt trái', SR: 'Trượt phải',
      L: 'Xoay trái', R: 'Xoay phải', DL: 'Chéo trái', DR: 'Chéo phải', S: 'Dừng',
    };
    if (movementLabels[command]) {
      useRobotStore.getState().addHistoryItem({
        type: 'movement',
        title: movementLabels[command]!,
        description: `Lệnh: ${command}, Tốc độ: ${speed ?? currentSpeed.current}`,
        details: { command, speed: speed ?? currentSpeed.current },
      });
    }
  }, [publish]);

  // Set speed
  const setSpeed = useCallback((speed: number) => {
    currentSpeed.current = Math.max(0, Math.min(255, speed));
    setCurrentSpeedState(currentSpeed.current);
    publish(topicsRef.current.SPEED, { speed: currentSpeed.current, timestamp: Date.now() });
  }, [publish]);

  // Emergency stop
  const emergencyStop = useCallback(() => {
    const emergencyCommand: MQTTCommand = {
      type: 'S',
      speed: 0,
      timestamp: Date.now(),
    };

    publish(topicsRef.current.EMERGENCY, emergencyCommand);
    publish(topicsRef.current.COMMAND, emergencyCommand);
    console.log('[MQTT] EMERGENCY STOP sent!');

    useRobotStore.getState().addHistoryItem({
      type: 'alert',
      title: 'Emergency Stop',
      description: 'Kích hoạt dừng khẩn cấp — Robot đã dừng hoàn toàn',
    });
    useRobotStore.getState().addAlert({
      type: 'error',
      title: 'Dừng khẩn cấp',
      message: 'Đã kích hoạt dừng khẩn cấp - Robot đã dừng hoàn toàn',
    });
    robotEventsApi.log({
      eventType: 'alert',
      title: 'Emergency Stop',
      description: 'Kích hoạt dừng khẩn cấp',
      severity: 'error',
    });
  }, [publish]);

  // Send individual motor command
  const sendMotorCommand = useCallback((motor: MotorPosition, direction: 'F' | 'B' | 'S') => {
    const command = `${motor}_${direction}` as CommandType;
    const mqttCommand: MQTTCommand = {
      type: command,
      speed: currentSpeed.current,
      timestamp: Date.now(),
    };
    publish(topicsRef.current.MOTOR, mqttCommand);
    console.log('[MQTT] Motor command sent:', mqttCommand);
  }, [publish]);

  // Reset encoders
  const resetEncoders = useCallback(() => {
    publish(topicsRef.current.COMMAND, { type: 'RESET_ENCODERS', timestamp: Date.now() });
    console.log('[MQTT] Reset encoders command sent');
  }, [publish]);

  // Light control - Warning Light (Đèn cảnh báo)
  // No optimistic UI update — trust STATUS topic for actual state, otherwise
  // a failed publish or hardware fault leaves the button stuck ON.
  const setLight = useCallback((state: boolean) => {
    const command = state ? 'LIGHT_ON' : 'LIGHT_OFF';
    publish(topicsRef.current.LIGHT, { type: command, timestamp: Date.now() });
    console.log('[MQTT] Warning Light command sent:', command);
  }, [publish]);

  const toggleLight = useCallback(() => {
    publish(topicsRef.current.LIGHT, { type: 'LIGHT_T', timestamp: Date.now() });
    // Trust STATUS topic for actual light state — don't optimistically toggle
    // (firmware may reject the command if hardware is in fault, etc.)
    console.log('[MQTT] Warning Light toggle sent: LIGHT_T');
  }, [publish]);

  const setMainLight = useCallback((state: boolean) => {
    const command = state ? 'MAIN_ON' : 'MAIN_OFF';
    publish(topicsRef.current.MAIN_LIGHT, { type: command, timestamp: Date.now() });
    console.log('[MQTT] Main Light command sent:', command);
  }, [publish]);

  const toggleMainLight = useCallback(() => {
    publish(topicsRef.current.MAIN_LIGHT, { type: 'MAIN_T', timestamp: Date.now() });
    // Trust STATUS topic for actual light state.
    console.log('[MQTT] Main Light toggle sent: MAIN_T');
  }, [publish]);

  // V3: Safety control
  const safetyEnabledRef = useRef(safetyEnabled);
  useEffect(() => { safetyEnabledRef.current = safetyEnabled; }, [safetyEnabled]);
  const safetyToggleLockRef = useRef(false);

  const setSafetyEnabled = useCallback((enabled: boolean) => {
    const command: SafetyConfigCommand = { enabled, timestamp: Date.now() };
    publish(topicsRef.current.SAFETY_CONFIG, command);
    setSafetyEnabledState(enabled);
    safetyEnabledRef.current = enabled;
    console.log('[MQTT] Safety config sent:', enabled ? 'ENABLED' : 'DISABLED');
  }, [publish]);

  const toggleSafety = useCallback(() => {
    // In-flight guard: ignore rapid double-clicks that race the firmware ACK.
    if (safetyToggleLockRef.current) {
      console.log('[MQTT] Safety toggle ignored — in-flight');
      return;
    }
    safetyToggleLockRef.current = true;
    setSafetyEnabled(!safetyEnabledRef.current);
    setTimeout(() => { safetyToggleLockRef.current = false; }, 400);
  }, [setSafetyEnabled]);

  // V5: Navigation command (mode switch + clear_emergency)
  const sendNavCommand = useCallback((mode: NavMode | string, options: Record<string, any> = {}) => {
    publish(topicsRef.current.NAV_COMMAND, { mode, ...options, timestamp: Date.now() });
    console.log('[MQTT] Nav command:', mode, options);
  }, [publish]);

  // V5: Script command (library + recorder)
  // V5.3: GPS waypoint route — set / start / stop
  const sendGpsRoute = useCallback(
    (action: GPSRouteAction, waypoints?: GPSWaypoint[], opts: { loop?: boolean } = {}) => {
      const cmd: GPSRouteCommand = { action, timestamp: Date.now() };
      if (action === 'set' && waypoints) {
        cmd.waypoints = waypoints;
        cmd.loop = opts.loop ?? false;
        setGpsRoute(waypoints);
      }
      publish(topicsRef.current.GPS_ROUTE, cmd);
      console.log('[MQTT] GPS route command:', action, waypoints?.length ?? 0, 'wp');
    },
    [publish],
  );

  // V5.3: Buzzer pattern (firmware non-blocking state machine)
  const sendBuzzerPattern = useCallback(
    (pattern: BuzzerPattern) => {
      publish(topicsRef.current.BUZZ, { pattern, timestamp: Date.now() });
      setBuzzerPattern(pattern);
      console.log('[MQTT] Buzzer pattern:', pattern);
    },
    [publish],
  );

  // V5.3: Light pattern (firmware non-blocking state machine)
  const sendLightPattern = useCallback(
    (pattern: LightPattern) => {
      publish(topicsRef.current.LIGHT_PATTERN, { pattern, timestamp: Date.now() });
      setLightPattern(pattern);
      console.log('[MQTT] Light pattern:', pattern);
    },
    [publish],
  );

  // V10: Clear detection alerts
  const clearDetectionAlerts = useCallback(() => {
    setDetectionAlerts([]);
  }, []);

  // Camera control
  const sendCameraCommand = useCallback(
    (action: CameraCommand['action'], options: Partial<Omit<CameraCommand, 'action' | 'timestamp'>> = {}) => {
      const cmd: CameraCommand = { action, ...options, timestamp: Date.now() };
      publish(topicsRef.current.CAMERA_COMMAND, cmd);
      console.log('[MQTT] Camera command sent:', action, options);
    },
    [publish],
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      disconnect();
    };
  }, []);

  // Heartbeat interval
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const heartbeat: MQTTHeartbeat = {
        clientId: MQTT_CONFIG.clientId,
        status: 'online',
        timestamp: Date.now(),
      };
      publish(topicsRef.current.HEARTBEAT, heartbeat);
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, publish]);

  const value: MQTTContextValue = {
    isConnected,
    isRobotOnline,
    isMotorControllerOnline,
    isEncoderReaderOnline,
    robotStatus,
    encoders,
    motors,
    lastHeartbeat,
    connectionError,
    currentSpeed: currentSpeedState,
    lightState,
    mainLightState,
    // V3: Safety & IMU
    safetyStatus,
    imuData,
    safetyEnabled,
    // V5.3: Nav + GPS + Buzzer + Light state
    navStatus,
    gpsStatus,
    gpsRoute,
    buzzerPattern,
    lightPattern,
    // Actions
    connect,
    disconnect,
    sendCommand,
    sendMotorCommand,
    setSpeed,
    emergencyStop,
    resetEncoders,
    setLight,
    toggleLight,
    setMainLight,
    toggleMainLight,
    // V3: Safety controls
    setSafetyEnabled,
    toggleSafety,
    // V5.3: Nav + GPS + Buzzer + Light actions
    sendNavCommand,
    sendGpsRoute,
    sendBuzzerPattern,
    sendLightPattern,
    // Camera
    sendCameraCommand,
    // Sensor + camera + marker states
    sensorsData,
    cameraStatus,
    markersData,
    // V10: AI detection alerts
    detectionAlerts,
    clearDetectionAlerts,
    // V5.2: Outdoor GPS
    gpsData,
    publish,
  };

  return (
    <MQTTContext.Provider value={value}>
      {children}
    </MQTTContext.Provider>
  );
}

export function useMQTT() {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within a MQTTProvider');
  }
  return context;
}

// Hook for simple command sending
export function useRobotControl() {
  const {
    sendCommand,
    sendMotorCommand,
    setSpeed,
    emergencyStop,
    resetEncoders,
    setLight,
    toggleLight,
    setMainLight,
    toggleMainLight,
    isConnected,
    isRobotOnline,
    isMotorControllerOnline,
    isEncoderReaderOnline,
    encoders,
    motors,
    currentSpeed,
    lightState,
    mainLightState,
    // V3: Safety & IMU
    safetyStatus,
    imuData,
    safetyEnabled,
    setSafetyEnabled,
    toggleSafety,
    // Camera
    sendCameraCommand,
    sensorsData,
    cameraStatus,
    markersData,
  } = useMQTT();

  return {
    // Movement commands (match ESP32-S3 serial protocol)
    forward: (speed?: number) => sendCommand('F', speed),
    backward: (speed?: number) => sendCommand('B', speed),
    strafeLeft: (speed?: number) => sendCommand('SL', speed),
    strafeRight: (speed?: number) => sendCommand('SR', speed),
    rotateLeft: (speed?: number) => sendCommand('L', speed),
    rotateRight: (speed?: number) => sendCommand('R', speed),

    // Diagonal
    diagonalLeft: (speed?: number) => sendCommand('DL', speed),
    diagonalRight: (speed?: number) => sendCommand('DR', speed),

    // Stop
    stop: () => sendCommand('S'),
    emergencyStop,

    // Individual motor control
    motorFR: (dir: 'F' | 'B' | 'S') => sendMotorCommand('FR', dir),
    motorFL: (dir: 'F' | 'B' | 'S') => sendMotorCommand('FL', dir),
    motorBR: (dir: 'F' | 'B' | 'S') => sendMotorCommand('BR', dir),
    motorBL: (dir: 'F' | 'B' | 'S') => sendMotorCommand('BL', dir),

    // Warning Light control (Đèn cảnh báo - GPIO 38)
    lightOn: () => setLight(true),
    lightOff: () => setLight(false),
    toggleLight,
    lightState,

    // Main Light control (Đèn chính - GPIO 39)
    mainLightOn: () => setMainLight(true),
    mainLightOff: () => setMainLight(false),
    toggleMainLight,
    mainLightState,

    // Speed & Encoders
    setSpeed,
    resetEncoders,
    currentSpeed,

    // V3: Safety control
    safetyStatus,
    imuData,
    safetyEnabled,
    setSafetyEnabled,
    toggleSafety,

    // Camera, Markers, Sensors
    sendCameraCommand,
    sensorsData,
    cameraStatus,
    markersData,

    // Status
    isReady: isConnected && isRobotOnline && isMotorControllerOnline,
    isConnected,
    isRobotOnline,
    isMotorControllerOnline,
    isEncoderReaderOnline,

    // Data
    encoders,
    motors,
  };
}
