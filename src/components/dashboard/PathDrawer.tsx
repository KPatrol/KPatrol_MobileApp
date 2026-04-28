'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Ruler, Sparkles, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScriptStep, Waypoint } from '@/lib/mqtt-config';
import {
  DEFAULT_PATH_CONFIG,
  compilePathToSteps,
  estimatePath,
} from '@/lib/path-compiler';

// Canvas → world scaling. One side of the canvas maps to `worldSpanM` metres.
const DEFAULT_WORLD_SPAN_M = 4.0;  // 4m × 4m drawing area

export interface PathDrawerProps {
  onCompiled?: (steps: ScriptStep[], waypoints: Waypoint[]) => void;
  speedPct?: number;
  worldSpanM?: number;
  fullLinearMps?: number;
  fullAngularDps?: number;
}

type Pt = { x: number; y: number };

export function PathDrawer({
  onCompiled,
  speedPct = 60,
  worldSpanM = DEFAULT_WORLD_SPAN_M,
  fullLinearMps = 0.50,
  fullAngularDps = 90.0,
}: PathDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef   = useRef<HTMLDivElement | null>(null);
  const [stroke, setStroke] = useState<Pt[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [size, setSize] = useState({ w: 320, h: 320 });

  // ResizeObserver keeps the canvas square and responsive.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const side = Math.min(e.contentRect.width, 420);
        setSize({ w: side, h: side });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Canvas → world metres. Canvas origin at center, +x right, +y up.
  // Robot path-local: +x forward (up on screen), +y left (left on screen).
  const canvasToWorld = useCallback((p: Pt): Waypoint => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const mPerPx = worldSpanM / size.w;
    return {
      x: (cy - p.y) * mPerPx,   // up on screen → forward
      y: (cx - p.x) * mPerPx,   // left on screen → +y (left of robot)
    };
  }, [size, worldSpanM]);

  const worldToCanvas = useCallback((w: Waypoint): Pt => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const pxPerM = size.w / worldSpanM;
    return {
      x: cx - w.y * pxPerM,
      y: cy - w.x * pxPerM,
    };
  }, [size, worldSpanM]);

  // Compile current stroke on every change — cheap thanks to RDP.
  const waypoints: Waypoint[] = stroke.map(canvasToWorld);
  const steps = compilePathToSteps(waypoints, DEFAULT_PATH_CONFIG, speedPct);
  const est = estimatePath(steps, fullLinearMps, fullAngularDps, speedPct);

  // Redraw canvas whenever stroke or size changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    const gridStepM = 0.5;
    const pxPerM = size.w / worldSpanM;
    const stepPx = gridStepM * pxPerM;
    for (let x = (size.w / 2) % stepPx; x < size.w; x += stepPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.h); ctx.stroke();
    }
    for (let y = (size.h / 2) % stepPx; y < size.h; y += stepPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.w, y); ctx.stroke();
    }

    // Center axes
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.moveTo(size.w / 2, 0); ctx.lineTo(size.w / 2, size.h);
    ctx.moveTo(0, size.h / 2); ctx.lineTo(size.w, size.h / 2);
    ctx.stroke();

    // Robot start marker (center, facing up)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.beginPath();
    ctx.arc(size.w / 2, size.h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size.w / 2, size.h / 2);
    ctx.lineTo(size.w / 2, size.h / 2 - 14);
    ctx.stroke();

    // Raw stroke (faint)
    if (stroke.length > 1) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }

    // Simplified/compiled polyline — reconstruct from steps so the user
    // sees exactly what will be executed.
    if (steps.length > 0) {
      let heading = 0;
      let pos: Waypoint = { x: 0, y: 0 };
      const polyline: Pt[] = [worldToCanvas(pos)];
      for (const s of steps) {
        if (s.op === 'rotate' && s.angle_deg) {
          const sign = s.direction === 'left' ? 1 : -1;
          heading += sign * s.angle_deg;
        } else if (s.op === 'move_distance' && s.distance_m) {
          const rad = (heading * Math.PI) / 180;
          pos = {
            x: pos.x + s.distance_m * Math.cos(rad),
            y: pos.y + s.distance_m * Math.sin(rad),
          };
          polyline.push(worldToCanvas(pos));
        }
      }
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(polyline[0].x, polyline[0].y);
      for (let i = 1; i < polyline.length; i++) {
        ctx.lineTo(polyline[i].x, polyline[i].y);
      }
      ctx.stroke();
      // Vertex dots
      ctx.fillStyle = 'rgba(34, 197, 94, 0.95)';
      for (const p of polyline) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }, [stroke, size, worldSpanM, steps, worldToCanvas]);

  function getPt(e: React.PointerEvent<HTMLCanvasElement>): Pt {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    // Seed the stroke with the robot start (canvas center) so the first
    // segment always originates from the robot's pose.
    setStroke([{ x: size.w / 2, y: size.h / 2 }, getPt(e)]);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const p = getPt(e);
    setStroke((prev) => {
      if (!prev.length) return [p];
      const last = prev[prev.length - 1];
      // Throttle — ignore pixel-tiny moves
      if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return prev;
      return [...prev, p];
    });
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    setDrawing(false);
  }

  function clearStroke() {
    setStroke([]);
  }

  function undoLast() {
    setStroke((prev) => prev.slice(0, Math.max(0, prev.length - 8)));
  }

  function emitCompiled() {
    if (!onCompiled || steps.length === 0) return;
    onCompiled(steps, waypoints);
  }

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative w-full flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Bản đồ vẽ đường đi robot — khung ${worldSpanM.toFixed(1)}m × ${worldSpanM.toFixed(1)}m, ${steps.length} bước, khoảng ${est.totalDistM.toFixed(2)} mét, thời gian ước tính ${est.etaSec.toFixed(1)} giây`}
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
          className="rounded-lg border border-slate-700/50 bg-slate-950/60 cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <span role="status" aria-live="polite" className="sr-only">
          {steps.length > 0
            ? `${steps.length} bước đã biên dịch, ${est.totalDistM.toFixed(2)} mét, ${Math.round(est.totalRotDeg)} độ xoay, ước tính ${est.etaSec.toFixed(1)} giây`
            : 'Chưa có đường vẽ'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded">
          <Ruler className="w-3 h-3" />
          {worldSpanM.toFixed(1)}m × {worldSpanM.toFixed(1)}m
        </span>
        <span className="bg-slate-800/60 px-2 py-0.5 rounded">
          {steps.length} bước
        </span>
        <span className="bg-slate-800/60 px-2 py-0.5 rounded">
          {est.totalDistM.toFixed(2)}m
        </span>
        <span className="bg-slate-800/60 px-2 py-0.5 rounded">
          {Math.round(est.totalRotDeg)}°
        </span>
        <span className="bg-slate-800/60 px-2 py-0.5 rounded">
          ≈ {est.etaSec.toFixed(1)}s
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={undoLast}
          disabled={stroke.length === 0}
          aria-label="Hoàn tác nét vẽ gần nhất"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600/40 text-[11px] text-slate-300 hover:border-slate-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kpatrol-400 transition-colors disabled:opacity-40"
        >
          <Undo2 className="w-3 h-3" aria-hidden="true" />
          Undo
        </button>
        <button
          type="button"
          onClick={clearStroke}
          disabled={stroke.length === 0}
          aria-label="Xoá toàn bộ nét vẽ"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600/40 text-[11px] text-slate-300 hover:border-red-500/50 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 transition-colors disabled:opacity-40"
        >
          <Eraser className="w-3 h-3" aria-hidden="true" />
          Xoá
        </button>
        <button
          type="button"
          onClick={emitCompiled}
          disabled={steps.length === 0}
          aria-label={`Thêm ${steps.length} bước vừa biên dịch vào builder kịch bản`}
          className={cn(
            'ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kpatrol-400',
            steps.length === 0
              ? 'bg-slate-800 border border-slate-700/40 text-slate-500'
              : 'bg-kpatrol-500/20 border border-kpatrol-500/40 text-kpatrol-300 hover:bg-kpatrol-500/30',
          )}
        >
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Thêm vào builder
        </button>
      </div>
    </div>
  );
}
