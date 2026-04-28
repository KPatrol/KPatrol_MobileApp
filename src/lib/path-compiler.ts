// Client-side mirror of robots/pi-controller/navigation/script_patrol.py
// compile_path_to_steps + _rdp_simplify. Used by the drawn-path UI to
// preview how many rotate/move steps a sketch will produce and to
// estimate execution time before sending to the Pi.

import type { ScriptStep, Waypoint } from './mqtt-config';

export interface PathCompilerConfig {
  pathMinSegmentM:      number;   // drop segments shorter than this
  pathSimplifyEpsilonM: number;   // RDP simplification epsilon (0 = disabled)
  rotateTolDeg:         number;   // don't emit rotate steps below this
}

export const DEFAULT_PATH_CONFIG: PathCompilerConfig = {
  pathMinSegmentM:      0.02,
  pathSimplifyEpsilonM: 0.03,
  rotateTolDeg:         2.0,
};

// Wrap to (-180, 180]
export function signedAngleDiff(a: number, b: number): number {
  return ((a - b + 180) % 360 + 360) % 360 - 180;
}

type Pt = [number, number];

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [px, py] = p;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function rdpSimplify(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let maxD = 0;
  let index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) {
      maxD = d;
      index = i;
    }
  }
  if (maxD > epsilon) {
    const left  = rdpSimplify(pts.slice(0, index + 1), epsilon);
    const right = rdpSimplify(pts.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

/**
 * Compile drawn waypoints into a sequence of rotate + move_distance steps.
 * Assumes the robot starts at waypoints[0] facing +x (local heading 0°).
 *
 * Strategy: RDP-simplify → for each segment, turn-in-place to heading,
 * then drive straight. Mirrors Pi's compile_path_to_steps exactly.
 */
export function compilePathToSteps(
  waypoints: Waypoint[],
  cfg: PathCompilerConfig = DEFAULT_PATH_CONFIG,
  speedPct?: number,
): ScriptStep[] {
  if (!waypoints || waypoints.length < 2) return [];

  let pts: Pt[] = waypoints.map((w) => [w.x, w.y]);
  if (cfg.pathSimplifyEpsilonM > 0) {
    pts = rdpSimplify(pts, cfg.pathSimplifyEpsilonM);
  }

  const steps: ScriptStep[] = [];
  let currentHeading = 0.0;
  let prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const pt = pts[i];
    const dx = pt[0] - prev[0];
    const dy = pt[1] - prev[1];
    const dist = Math.hypot(dx, dy);
    if (dist < cfg.pathMinSegmentM) continue;

    const targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
    const delta = signedAngleDiff(targetHeading, currentHeading);
    if (Math.abs(delta) > cfg.rotateTolDeg) {
      steps.push({
        op:         'rotate',
        angle_deg:  Math.abs(delta),
        direction:  delta > 0 ? 'left' : 'right',
        speed_pct:  speedPct,
      });
    }
    steps.push({
      op:         'move_distance',
      distance_m: dist,
      direction:  'forward',
      speed_pct:  speedPct,
    });
    currentHeading = targetHeading;
    prev = pt;
  }

  return steps;
}

export interface PathEstimate {
  steps:        ScriptStep[];
  totalDistM:   number;
  totalRotDeg:  number;
  etaSec:       number;
}

/**
 * Quick duration estimate for a compiled path. Uses the same calibration
 * constants as Pi's ScriptConfig (full_linear_mps, full_angular_dps) so the
 * UI preview matches actual runtime within a few percent.
 */
export function estimatePath(
  steps: ScriptStep[],
  fullLinearMps:  number = 0.50,
  fullAngularDps: number = 90.0,
  defaultSpeedPct: number = 60,
): PathEstimate {
  let totalDistM = 0;
  let totalRotDeg = 0;
  let etaSec = 0;
  for (const s of steps) {
    const pct = (s.speed_pct ?? defaultSpeedPct) / 100;
    if (s.op === 'move_distance' && s.distance_m) {
      totalDistM += s.distance_m;
      const v = Math.max(0.05, fullLinearMps * pct);
      etaSec += s.distance_m / v;
    } else if (s.op === 'rotate' && s.angle_deg) {
      totalRotDeg += s.angle_deg;
      const w = Math.max(5, fullAngularDps * pct);
      etaSec += s.angle_deg / w;
    } else if (s.op === 'pause' && s.duration_s) {
      etaSec += s.duration_s;
    } else if (s.op === 'forward_time' && s.duration_s) {
      etaSec += s.duration_s;
    } else if (s.op === 'backward_time' && s.duration_s) {
      etaSec += s.duration_s;
    } else if (s.op === 'strafe_time' && s.duration_s) {
      etaSec += s.duration_s;
    }
  }
  return { steps, totalDistM, totalRotDeg, etaSec };
}
