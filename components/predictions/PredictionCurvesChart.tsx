"use client";

import React, { useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import {
  formatClock,
  type CookingWindow,
  type EnvironmentPoint,
} from '@/hooks/usePredictionsDashboard';

interface PredictionCurvesChartProps {
  windows: CookingWindow[];
  environment: EnvironmentPoint[];
  isForecasting: boolean;
  selectedWindowId: string | null;
  hoveredWindowId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

// Fixed geometry so pointer positions can be mapped back to (time, °C) without Recharts internals.
const MARGIN = { top: 16, right: 56, bottom: 0, left: 0 };
const Y_AXIS_WIDTH = 52;
const X_AXIS_HEIGHT = 30;
const CHART_HEIGHT = 360;
const SUN_BAND_HEIGHT = 56;
const PICK_RADIUS_PX = 48;

function tempAt(w: CookingWindow, t: number): number | null {
  const pts = w.points;
  if (!pts.length || t < pts[0].t || t > pts[pts.length - 1].t) return null;
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = pts[lo], b = pts[hi];
  return b.t === a.t ? a.temp : a.temp + ((t - a.t) / (b.t - a.t)) * (b.temp - a.temp);
}

interface HoverState { id: string; x: number; y: number; t: number; temp: number; flip: boolean }

export function PredictionCurvesChart({
  windows,
  environment,
  isForecasting,
  selectedWindowId,
  hoveredWindowId,
  onSelect,
  onHover,
}: PredictionCurvesChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<HoverState | null>(null);

  const { tMin, tMax, yMin, yMax } = useMemo(() => {
    let lo = Infinity, hi = -Infinity, low = Infinity, high = -Infinity;
    for (const w of windows) for (const p of w.points) {
      lo = Math.min(lo, p.t); hi = Math.max(hi, p.t);
      low = Math.min(low, p.temp); high = Math.max(high, p.temp);
    }
    return {
      tMin: lo, tMax: hi,
      yMin: Math.floor(Math.min(low, 20) / 10) * 10,
      yMax: Math.max(100, Math.ceil(high / 10) * 10),
    };
  }, [windows]);

  // Whole-hour ticks; Recharts would otherwise tick every point of the per-line data.
  const hourTicks = useMemo(() => {
    if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) return [];
    const first = new Date(tMin);
    first.setMinutes(0, 0, 0);
    if (first.getTime() < tMin) first.setHours(first.getHours() + 1);
    const ticks: number[] = [];
    for (let t = first.getTime(); t <= tMax; t += 3600000) ticks.push(t);
    return ticks;
  }, [tMin, tMax]);

  const sunData = useMemo(
    () => environment.filter(p => p.t >= tMin && p.t <= tMax && p.solar_radiation != null),
    [environment, tMin, tMax]
  );

  // Ghosts first, hovered next, selected last — SVG paints later children on top.
  const ordered = useMemo(() => {
    const rank = (id: string) => (id === selectedWindowId ? 2 : id === hoveredWindowId ? 1 : 0);
    return [...windows].sort((a, b) => rank(a.id) - rank(b.id));
  }, [windows, selectedWindowId, hoveredWindowId]);

  const selected = windows.find(w => w.id === selectedWindowId);
  const selectedEnd = selected?.points[selected.points.length - 1];

  const nearestAt = (clientX: number, clientY: number): HoverState | null => {
    const el = plotRef.current;
    if (!el || !windows.length) return null;
    const rect = el.getBoundingClientRect();
    const left = MARGIN.left + Y_AXIS_WIDTH;
    const right = rect.width - MARGIN.right;
    const top = MARGIN.top;
    const bottom = CHART_HEIGHT - MARGIN.bottom - X_AXIS_HEIGHT;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < left || x > right || y < top - PICK_RADIUS_PX || y > bottom + PICK_RADIUS_PX) return null;

    const t = tMin + ((x - left) / (right - left)) * (tMax - tMin);
    const toPx = (temp: number) => bottom - ((temp - yMin) / (yMax - yMin)) * (bottom - top);

    let best: HoverState | null = null;
    let bestDist = PICK_RADIUS_PX;
    for (const w of windows) {
      const temp = tempAt(w, t);
      if (temp === null) continue;
      const dist = Math.abs(toPx(temp) - y);
      if (dist < bestDist) { bestDist = dist; best = { id: w.id, x, y: toPx(temp), t, temp, flip: x > rect.width / 2 }; }
    }
    return best;
  };

  const handleMove = (e: React.MouseEvent) => {
    const hit = nearestAt(e.clientX, e.clientY);
    setPointer(hit);
    if ((hit?.id ?? null) !== hoveredWindowId) onHover(hit?.id ?? null);
  };

  const handleLeave = () => {
    setPointer(null);
    onHover(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const hit = nearestAt(e.clientX, e.clientY);
    if (hit) onSelect(hit.id);
  };

  const hoveredLabel = windows.find(w => w.id === pointer?.id)?.label;
  const empty = windows.length === 0;

  return (
    <div className="relative">
      {isForecasting && (
        <div className="absolute inset-0 z-10 bg-card/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
          <Loader2 className="w-10 h-10 text-sun animate-spin motion-reduce:animate-none mb-3" />
          <p className="text-foreground font-medium">Predicting water temperature…</p>
        </div>
      )}

      {empty && !isForecasting ? (
        <div className="flex h-[416px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-center">
          <p className="font-medium text-foreground">No cooking curves for this day</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick another date, or refresh the forecast.</p>
        </div>
      ) : (
        <>
          {/* Sun strength on the same time axis as the curves: explains why later starts heat slower. */}
          <div className="relative" style={{ height: SUN_BAND_HEIGHT }} aria-hidden="true">
            <span className="absolute left-0 top-1 text-xs text-muted-foreground">Sun</span>
            {sunData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sunData} margin={{ ...MARGIN, top: 4 }}>
                  <XAxis dataKey="t" type="number" domain={[tMin, tMax]} hide />
                  <YAxis width={Y_AXIS_WIDTH} domain={[0, 'dataMax']} tick={false} axisLine={false} tickLine={false} />
                  <Area
                    type="monotone"
                    dataKey="solar_radiation"
                    stroke="var(--sun)"
                    strokeOpacity={0.6}
                    fill="var(--sun)"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div
            ref={plotRef}
            className="relative cursor-crosshair select-none"
            style={{ height: CHART_HEIGHT, cursor: pointer ? 'pointer' : undefined }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={handleClick}
          >
            <ResponsiveContainer width="100%" height="100%">
              {/* The start-time chips are the keyboard path; skip Recharts' focusable SVG layer. */}
              <LineChart margin={MARGIN} accessibilityLayer={false}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[tMin, tMax]}
                  height={X_AXIS_HEIGHT}
                  scale="time"
                  tickFormatter={formatClock}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  ticks={hourTicks}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={Y_AXIS_WIDTH}
                  domain={[yMin, yMax]}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val} °C`}
                />
                <ReferenceLine
                  y={90}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: '90 °C', position: 'right', fill: 'var(--muted-foreground)', fontSize: 11 }}
                />

                {ordered.map(w => {
                  const isSelected = w.id === selectedWindowId;
                  const isHovered = w.id === hoveredWindowId;
                  return (
                    <Line
                      key={w.id}
                      data={w.points}
                      dataKey="temp"
                      type="monotone"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                      stroke={isSelected || isHovered ? 'var(--sun)' : 'var(--muted-foreground)'}
                      strokeWidth={isSelected ? 3.5 : isHovered ? 2 : 1.25}
                      strokeOpacity={isSelected ? 1 : isHovered ? 0.7 : 0.3}
                    />
                  );
                })}

                {selected && selectedEnd && (
                  <ReferenceDot
                    x={selectedEnd.t}
                    y={selectedEnd.temp}
                    r={4}
                    fill="var(--sun)"
                    stroke="none"
                    label={{
                      value: selected.label,
                      position: 'top',
                      offset: 10,
                      fill: 'var(--sun)',
                      fontSize: 12,
                      fontWeight: 600,
                      // Card-coloured halo keeps the label legible over the ghost curves.
                      stroke: 'var(--card)',
                      strokeWidth: 4,
                      paintOrder: 'stroke',
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>

            {pointer && hoveredLabel && (
              <div
                className="pointer-events-none absolute z-20 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                style={{
                  left: pointer.x,
                  top: pointer.y,
                  transform: `translate(${pointer.flip ?'calc(-100% - 12px)' : '12px'}, -50%)`,
                }}
              >
                <div className="font-semibold text-sun">Start {hoveredLabel}</div>
                <div className="tabular-nums text-muted-foreground">
                  {pointer.temp.toFixed(1)} °C at {formatClock(pointer.t)}
                </div>
                {pointer.id !== selectedWindowId && <div className="text-muted-foreground">Click to select</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
