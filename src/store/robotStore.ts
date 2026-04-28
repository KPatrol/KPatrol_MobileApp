import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== TYPES =====

export interface RobotPosition {
  x: number;
  y: number;
  heading: number;
}

export interface MotorStatus {
  frontLeft: boolean;
  frontRight: boolean;
  rearLeft: boolean;
  rearRight: boolean;
}

export interface MotorPower {
  m1: number;
  m2: number;
  m3: number;
  m4: number;
}

export interface SensorData {
  frontDistance: number;
  rearDistance: number;
  leftDistance: number;
  rightDistance: number;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'movement' | 'alert' | 'system' | 'patrol';
  title: string;
  description: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface CameraSettings {
  quality: '480p' | '720p' | '1080p';
  mode: 'normal' | 'night' | 'thermal';
  zoom: number;
  isRecording: boolean;
}

export interface RobotStatus {
  isConnected: boolean;
  batteryLevel: number;
  speed: number;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  ramUsage: number;
  uptime: number;
  lastUpdate: Date | null;
  position: RobotPosition;
  motors: MotorPower;
  motorStatus: MotorStatus;
  sensors: SensorData;
}

export interface ControlState {
  joystickX: number;
  joystickY: number;
  rotation: number;
  currentSpeed: number;
  maxSpeed: number;
  isManualMode: boolean;
  safetyMode: boolean;
  obstacleAvoidance: boolean;
}

// User-configurable quick action shown in the sidebar.
// `actionId` references a known catalog entry (see QUICK_ACTION_CATALOG below);
// `enabled` toggles visibility; `active` is the latest on/off state of the action itself.
export type QuickActionId =
  | 'autoPatrol'
  | 'ecoMode'
  | 'nightMode'
  | 'mainLight'
  | 'warningLight'
  | 'lockControls'
  | 'recordSession'
  | 'silentMode';

export interface QuickActionConfig {
  id: QuickActionId;
  enabled: boolean;
  active: boolean;
}

export interface AppSettings {
  darkMode: boolean;
  language: string;
  serverUrl: string;
  robotId: string;
  autoReconnect: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quickActions: QuickActionConfig[];
}

interface RobotStore extends RobotStatus, ControlState {
  // Camera
  camera: CameraSettings;
  
  // Alerts & History
  alerts: Alert[];
  history: HistoryItem[];
  
  // Settings
  settings: AppSettings;

  // Actions - Status
  setConnected: (connected: boolean) => void;
  updateStatus: (status: Partial<RobotStatus>) => void;
  updateTelemetry: (telemetry: Partial<RobotStatus>) => void;
  
  // Actions - Control
  setJoystick: (x: number, y: number) => void;
  setRotation: (rotation: number) => void;
  setSpeed: (speed: number) => void;
  setMaxSpeed: (speed: number) => void;
  setManualMode: (manual: boolean) => void;
  setSafetyMode: (enabled: boolean) => void;
  setObstacleAvoidance: (enabled: boolean) => void;
  stopAll: () => void;
  emergencyStop: () => void;
  
  // Actions - Camera
  setCameraQuality: (quality: CameraSettings['quality']) => void;
  setCameraMode: (mode: CameraSettings['mode']) => void;
  setCameraZoom: (zoom: number) => void;
  setRecording: (recording: boolean) => void;
  
  // Actions - Alerts
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  clearAlerts: () => void;
  
  // Actions - History
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  darkMode: true,
  language: 'vi',
  serverUrl: 'ws://192.168.1.100:4000',
  robotId: 'KPATROL-001',
  autoReconnect: true,
  pushNotifications: true,
  soundEnabled: false,
  vibrationEnabled: true,
  // Empty by default — user picks their own from the catalog in Settings → Thao tác nhanh.
  quickActions: [],
};

export const useRobotStore = create<RobotStore>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====
      
      // Status
      isConnected: false,
      batteryLevel: 85,
      speed: 0,
      temperature: 42,
      cpuUsage: 35,
      memoryUsage: 48,
      ramUsage: 48,
      uptime: 3600,
      lastUpdate: null,
      position: { x: 0, y: 0, heading: 0 },
      motors: { m1: 0, m2: 0, m3: 0, m4: 0 },
      motorStatus: {
        frontLeft: true,
        frontRight: true,
        rearLeft: true,
        rearRight: true,
      },
      sensors: {
        frontDistance: 100,
        rearDistance: 100,
        leftDistance: 100,
        rightDistance: 100,
      },

      // Control
      joystickX: 0,
      joystickY: 0,
      rotation: 0,
      currentSpeed: 50,
      maxSpeed: 100,
      isManualMode: true,
      safetyMode: true,
      obstacleAvoidance: true,

      // Camera
      camera: {
        quality: '720p',
        mode: 'normal',
        zoom: 1,
        isRecording: false,
      },

      // Alerts
      alerts: [],

      // History
      history: [],

      // Settings
      settings: defaultSettings,

      // ===== ACTIONS =====

      // Status Actions
      setConnected: (connected) => {
        set({ isConnected: connected, lastUpdate: new Date() });
        if (!connected) {
          get().addAlert({
            type: 'warning',
            title: 'Mất kết nối',
            message: 'Đã mất kết nối với robot',
          });
        }
      },

      updateStatus: (status) => set((state) => ({
        ...state,
        ...status,
        lastUpdate: new Date(),
      })),

      updateTelemetry: (telemetry) => set((state) => ({
        ...state,
        ...telemetry,
        lastUpdate: new Date(),
      })),

      // Control Actions
      setJoystick: (x, y) => set({ joystickX: x, joystickY: y }),

      setRotation: (rotation) => set({ rotation }),

      setSpeed: (speed) => set({ currentSpeed: Math.max(0, Math.min(100, speed)) }),

      setMaxSpeed: (speed) => set({ maxSpeed: Math.max(10, Math.min(100, speed)) }),

      setManualMode: (manual) => {
        set({ isManualMode: manual });
        get().addHistoryItem({
          type: 'system',
          title: manual ? 'Chế độ thủ công' : 'Chế độ tự động',
          description: `Đã chuyển sang chế độ ${manual ? 'điều khiển thủ công' : 'tuần tra tự động'}`,
        });
      },

      setSafetyMode: (enabled) => set({ safetyMode: enabled }),

      setObstacleAvoidance: (enabled) => set({ obstacleAvoidance: enabled }),

      stopAll: () => set({
        joystickX: 0,
        joystickY: 0,
        rotation: 0,
        speed: 0,
        motors: { m1: 0, m2: 0, m3: 0, m4: 0 },
      }),

      emergencyStop: () => {
        set({
          joystickX: 0,
          joystickY: 0,
          rotation: 0,
          speed: 0,
          motors: { m1: 0, m2: 0, m3: 0, m4: 0 },
        });
        get().addAlert({
          type: 'error',
          title: 'Dừng khẩn cấp',
          message: 'Đã kích hoạt dừng khẩn cấp - Robot đã dừng hoàn toàn',
        });
        get().addHistoryItem({
          type: 'alert',
          title: 'Emergency Stop',
          description: 'Kích hoạt dừng khẩn cấp',
        });
      },

      // Camera Actions
      setCameraQuality: (quality) => set((state) => ({
        camera: { ...state.camera, quality },
      })),

      setCameraMode: (mode) => set((state) => ({
        camera: { ...state.camera, mode },
      })),

      setCameraZoom: (zoom) => set((state) => ({
        camera: { ...state.camera, zoom: Math.max(1, Math.min(5, zoom)) },
      })),

      setRecording: (recording) => {
        set((state) => ({
          camera: { ...state.camera, isRecording: recording },
        }));
        get().addHistoryItem({
          type: 'system',
          title: recording ? 'Bắt đầu ghi hình' : 'Dừng ghi hình',
          description: recording 
            ? 'Đã bắt đầu ghi video từ camera' 
            : 'Đã dừng ghi video',
        });
      },

      // Alert Actions
      addAlert: (alert) => set((state) => ({
        alerts: [
          {
            ...alert,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            read: false,
          },
          ...state.alerts,
        ].slice(0, 100), // Keep max 100 alerts
      })),

      markAlertRead: (id) => set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? { ...alert, read: true } : alert
        ),
      })),

      markAllAlertsRead: () => set((state) => ({
        alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
      })),

      clearAlerts: () => set({ alerts: [] }),

      // History Actions
      addHistoryItem: (item) => set((state) => ({
        history: [
          {
            ...item,
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
          },
          ...state.history,
        ].slice(0, 500), // Keep max 500 history items
      })),

      clearHistory: () => set({ history: [] }),

      // Settings Actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'kpatrol-store',
      partialize: (state) => ({
        settings: state.settings,
        alerts: state.alerts.slice(0, 20), // Persist only recent alerts
      }),
    }
  )
);
