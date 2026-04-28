import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Waypoint } from '@/components/map/PhenikaaMap';

export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  loop: boolean;
  speed: number;
  createdAt: number;
}

interface PatrolRouteState {
  current: Waypoint[];
  routes: SavedRoute[];
  loop: boolean;
  speed: number;
  selectedRouteId: string | null;

  addWaypoint: (lat: number, lng: number, label?: string) => void;
  updateWaypoint: (id: string, lat: number, lng: number) => void;
  removeWaypoint: (id: string) => void;
  reorderWaypoint: (fromIdx: number, toIdx: number) => void;
  clearWaypoints: () => void;
  setLoop: (loop: boolean) => void;
  setSpeed: (speed: number) => void;

  saveRoute: (name: string) => string;
  loadRoute: (id: string) => void;
  deleteRoute: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const usePatrolRouteStore = create<PatrolRouteState>()(
  persist(
    (set, get) => ({
      current: [],
      routes: [],
      loop: false,
      speed: 0.4,
      selectedRouteId: null,

      addWaypoint: (lat, lng, label) =>
        set((s) => ({
          current: [...s.current, { id: uid(), lat, lng, label }],
        })),

      updateWaypoint: (id, lat, lng) =>
        set((s) => ({
          current: s.current.map((wp) =>
            wp.id === id ? { ...wp, lat, lng } : wp,
          ),
        })),

      removeWaypoint: (id) =>
        set((s) => ({ current: s.current.filter((wp) => wp.id !== id) })),

      reorderWaypoint: (fromIdx, toIdx) =>
        set((s) => {
          const list = [...s.current];
          const [moved] = list.splice(fromIdx, 1);
          list.splice(toIdx, 0, moved);
          return { current: list };
        }),

      clearWaypoints: () => set({ current: [], selectedRouteId: null }),

      setLoop: (loop) => set({ loop }),
      setSpeed: (speed) => set({ speed }),

      saveRoute: (name) => {
        const { current, loop, speed } = get();
        const route: SavedRoute = {
          id: uid(),
          name,
          waypoints: current,
          loop,
          speed,
          createdAt: Date.now(),
        };
        set((s) => ({ routes: [route, ...s.routes], selectedRouteId: route.id }));
        return route.id;
      },

      loadRoute: (id) => {
        const route = get().routes.find((r) => r.id === id);
        if (!route) return;
        set({
          current: route.waypoints.map((wp) => ({ ...wp, id: uid() })),
          loop: route.loop,
          speed: route.speed,
          selectedRouteId: id,
        });
      },

      deleteRoute: (id) =>
        set((s) => ({
          routes: s.routes.filter((r) => r.id !== id),
          selectedRouteId: s.selectedRouteId === id ? null : s.selectedRouteId,
        })),
    }),
    {
      name: 'kpatrol-patrol-routes',
      partialize: (s) => ({ routes: s.routes, loop: s.loop, speed: s.speed }),
    },
  ),
);
