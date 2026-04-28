import { describe, it, expect } from 'vitest';
import {
  compilePathToSteps,
  estimatePath,
  rdpSimplify,
  signedAngleDiff,
  DEFAULT_PATH_CONFIG,
} from './path-compiler';
import type { Waypoint } from './mqtt-config';

describe('signedAngleDiff', () => {
  it('wraps across the ±180° seam', () => {
    expect(signedAngleDiff(10, 350)).toBe(20);
    expect(signedAngleDiff(350, 10)).toBe(-20);
  });
  it('returns 0 for equal angles', () => {
    expect(signedAngleDiff(45, 45)).toBe(0);
  });
});

describe('rdpSimplify', () => {
  it('keeps endpoints when the line is already straight', () => {
    const pts: [number, number][] = [
      [0, 0], [1, 0], [2, 0], [3, 0],
    ];
    const out = rdpSimplify(pts, 0.01);
    expect(out).toEqual([[0, 0], [3, 0]]);
  });

  it('preserves a sharp corner above epsilon', () => {
    const pts: [number, number][] = [
      [0, 0], [1, 0], [1, 1], [2, 1],
    ];
    const out = rdpSimplify(pts, 0.1);
    // Must keep the corner near (1,0)/(1,1)
    expect(out.length).toBeGreaterThanOrEqual(3);
  });
});

describe('compilePathToSteps', () => {
  it('returns empty for fewer than 2 waypoints', () => {
    expect(compilePathToSteps([])).toEqual([]);
    expect(compilePathToSteps([{ x: 0, y: 0 }])).toEqual([]);
  });

  it('produces a move_distance for a straight forward segment', () => {
    const wps: Waypoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const steps = compilePathToSteps(wps, DEFAULT_PATH_CONFIG, 50);
    const moves = steps.filter((s) => s.op === 'move_distance');
    expect(moves).toHaveLength(1);
    expect(moves[0].distance_m).toBeCloseTo(1, 3);
    expect(moves[0].speed_pct).toBe(50);
  });

  it('emits rotate+move for a 90° turn', () => {
    const wps: Waypoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const steps = compilePathToSteps(wps);
    const ops = steps.map((s) => s.op);
    expect(ops).toContain('rotate');
    expect(ops).toContain('move_distance');
    const rotate = steps.find((s) => s.op === 'rotate')!;
    expect(rotate.angle_deg).toBeCloseTo(90, 1);
    expect(rotate.direction).toBe('left'); // +y from +x is CCW
  });

  it('drops sub-min segments', () => {
    const wps: Waypoint[] = [
      { x: 0, y: 0 },
      { x: 0.001, y: 0 },   // below pathMinSegmentM
      { x: 1, y: 0 },
    ];
    const steps = compilePathToSteps(wps);
    const moves = steps.filter((s) => s.op === 'move_distance');
    expect(moves).toHaveLength(1);
  });
});

describe('estimatePath', () => {
  it('sums distance, rotation, and ETA', () => {
    const wps: Waypoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const steps = compilePathToSteps(wps, DEFAULT_PATH_CONFIG, 100);
    const est = estimatePath(steps, 0.5, 90, 100);
    expect(est.totalDistM).toBeCloseTo(2, 2);
    expect(est.totalRotDeg).toBeCloseTo(90, 1);
    // 2m @ 0.5m/s + 90° @ 90°/s = 4s + 1s = 5s
    expect(est.etaSec).toBeCloseTo(5, 1);
  });

  it('never divides by zero when speed_pct is tiny', () => {
    const steps = [{ op: 'move_distance' as const, distance_m: 1, speed_pct: 0 }];
    const est = estimatePath(steps, 0.5, 90, 0);
    expect(Number.isFinite(est.etaSec)).toBe(true);
  });
});
