'use client';

import { createContext, useCallback, useContext, useEffect, useReducer, ReactNode } from 'react';
import { Robot, robotsApi, setAuthToken, setActiveRobotSerial } from '@/lib/api';
import { useAuthContext } from './AuthProvider';
import { useBackendDashboardSocket, type RobotStatusChanged } from '@/hooks/useBackendDashboardSocket';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RobotState {
  robots: Robot[];
  selectedRobot: Robot | null;
  isLoading: boolean;
}

type RobotAction =
  | { type: 'LOADING' }
  | { type: 'SET_ROBOTS'; robots: Robot[]; selected: Robot | null }
  | { type: 'SELECT'; robot: Robot }
  | { type: 'PATCH_ROBOT'; robotId: string; patch: Partial<Robot> }
  | { type: 'CLEAR' };

interface RobotContextValue extends RobotState {
  selectRobot: (robot: Robot) => void;
  refreshRobots: () => Promise<void>;
  createRobot: (data: { name: string; serialNumber: string; description?: string }) => Promise<Robot>;
  removeRobot: (id: string) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const RobotContext = createContext<RobotContextValue | null>(null);

const STORAGE_KEY = 'selectedRobotId';

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: RobotState, action: RobotAction): RobotState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true };
    case 'SET_ROBOTS':
      return { robots: action.robots, selectedRobot: action.selected, isLoading: false };
    case 'SELECT':
      return { ...state, selectedRobot: action.robot };
    case 'PATCH_ROBOT': {
      // Merge a realtime status update from the backend Socket.IO bridge into
      // the cached list (and selectedRobot if it matches). We avoid a list
      // refetch so the listing page reflects the heartbeat flip within ~1
      // network RTT instead of the 5s REST poll cadence.
      const robots = state.robots.map((r) =>
        r.id === action.robotId ? { ...r, ...action.patch } : r,
      );
      const selectedRobot =
        state.selectedRobot && state.selectedRobot.id === action.robotId
          ? { ...state.selectedRobot, ...action.patch }
          : state.selectedRobot;
      return { ...state, robots, selectedRobot };
    }
    case 'CLEAR':
      return { robots: [], selectedRobot: null, isLoading: false };
    default:
      return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function RobotProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuthContext();
  const [state, dispatch] = useReducer(reducer, {
    robots: [],
    selectedRobot: null,
    isLoading: false,
  });

  // Sync auth token + load robots in a single effect. Must run together so the
  // module-scope _authToken inside api.ts is set BEFORE robotsApi.getAll fires;
  // otherwise the first request after login goes out with no Bearer header,
  // the backend returns [] (no 401 — auth guard sees no token, scoping returns
  // empty list), and the UI shows "no robots" until the user reloads.
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setAuthToken(null);
      dispatch({ type: 'CLEAR' });
      return;
    }
    setAuthToken(token);
    loadRobots();
  }, [isAuthenticated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRobots = async () => {
    dispatch({ type: 'LOADING' });
    const robots = await robotsApi.getAll();

    // Restore previously selected robot
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const selected = savedId ? (robots.find((r) => r.id === savedId) ?? null) : null;
    if (selected) setActiveRobotSerial(selected.serialNumber);

    dispatch({ type: 'SET_ROBOTS', robots, selected });
  };

  const selectRobot = useCallback((robot: Robot) => {
    localStorage.setItem(STORAGE_KEY, robot.id);
    setActiveRobotSerial(robot.serialNumber);
    dispatch({ type: 'SELECT', robot });
  }, []);

  const refreshRobots = useCallback(async () => {
    await loadRobots();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime dashboard: push-merge ONLINE↔OFFLINE flips from backend without
  // waiting for the next REST poll. The gateway only emits to our `user:`
  // room, so we don't filter — every event here is already ours.
  const handleStatusChanged = useCallback((evt: RobotStatusChanged) => {
    const status = evt.status?.toString().toLowerCase();
    dispatch({
      type: 'PATCH_ROBOT',
      robotId: evt.robotId,
      patch: {
        status,
        lastSeen: evt.lastSeen,
      } as Partial<Robot>,
    });
  }, []);

  useBackendDashboardSocket({
    token,
    enabled: isAuthenticated && Boolean(token),
    onStatusChanged: handleStatusChanged,
  });

  const createRobot = useCallback(
    async (data: { name: string; serialNumber: string; description?: string }) => {
      const robot = await robotsApi.create(data);
      await loadRobots();
      return robot;
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const removeRobot = useCallback(async (id: string) => {
    const ok = await robotsApi.remove(id);
    if (ok) {
      if (state.selectedRobot?.id === id) {
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: 'SELECT', robot: null as unknown as Robot });
      }
      await loadRobots();
    }
    return ok;
  }, [state.selectedRobot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RobotContext.Provider
      value={{ ...state, selectRobot, refreshRobots, createRobot, removeRobot }}
    >
      {children}
    </RobotContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRobotContext(): RobotContextValue {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error('useRobotContext must be used inside <RobotProvider>');
  return ctx;
}
