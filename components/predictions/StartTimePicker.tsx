"use client";

import React, { useMemo, useRef } from 'react';
import type { CookingWindow, WindowPrediction } from '@/hooks/usePredictionsDashboard';
import { cookedAfter, formatNewtons } from './hardness';

interface StartTimePickerProps {
  windows: CookingWindow[];
  predictions: Record<string, WindowPrediction>;
  selectedWindowId: string | null;
  recommendedWindowId: string | null;
  hoveredWindowId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  thresholdN: number;
}

const SPARK_W = 122;
const SPARK_H = 32;
const TEMP_MIN = 20;
const TEMP_MAX = 100;

export function StartTimePicker({
  windows,
  predictions,
  selectedWindowId,
  recommendedWindowId,
  hoveredWindowId,
  onSelect,
  onHover,
  thresholdN,
}: StartTimePickerProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // One shared time scale, so later starts visibly begin further right — the same story the big chart tells.
  const [tMin, tMax] = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const w of windows) for (const p of w.points) { lo = Math.min(lo, p.t); hi = Math.max(hi, p.t); }
    return [lo, hi];
  }, [windows]);

  const sparkPath = (w: CookingWindow) => {
    const span = tMax - tMin || 1;
    return w.points
      .map((p, i) => {
        const x = ((p.t - tMin) / span) * SPARK_W;
        const clamped = Math.min(TEMP_MAX, Math.max(TEMP_MIN, p.temp));
        const y = SPARK_H - ((clamped - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * SPARK_H;
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join('');
  };

  // Roving tab index: only the checked chip (or the first) is tabbable; arrows move between chips.
  const focusIndex = Math.max(0, windows.findIndex(w => w.id === selectedWindowId));

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = windows.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index === last ? 0 : index + 1) :
      e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index === 0 ? last : index - 1) :
      e.key === 'Home' ? 0 :
      e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(windows[next].id);
    buttonRefs.current[next]?.focus();
    buttonRefs.current[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Cooking start time"
      className="flex gap-3 overflow-x-auto pt-1 pb-3 -mx-1 px-1 snap-x [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]"
    >
      {windows.map((w, index) => {
        const selected = w.id === selectedWindowId;
        const hovered = w.id === hoveredWindowId;
        const prediction = predictions[w.id];
        const doneAfter = prediction?.status === 'done' ? cookedAfter(prediction.value, thresholdN) : null;

        return (
          <button
            key={w.id}
            ref={el => { buttonRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onSelect(w.id)}
            onKeyDown={e => onKeyDown(e, index)}
            onMouseEnter={() => onHover(w.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(w.id)}
            onBlur={() => onHover(null)}
            className={`snap-start shrink-0 w-[9.25rem] rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              selected
                ? 'border-sun bg-sun/10'
                : hovered
                  ? 'border-sun/50 bg-muted/60'
                  : 'border-border bg-muted/30 hover:bg-muted/60'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-lg font-semibold tabular-nums ${selected ? 'text-sun' : 'text-foreground'}`}>
                {w.label}
              </span>
              {w.id === recommendedWindowId && (
                <span className="text-[11px] font-medium text-cooked">Softest</span>
              )}
            </div>

            <svg
              width={SPARK_W}
              height={SPARK_H}
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              className="my-2 block overflow-visible"
              aria-hidden="true"
            >
              <path
                d={sparkPath(w)}
                fill="none"
                strokeWidth={selected ? 2 : 1.5}
                strokeLinejoin="round"
                className={selected ? 'stroke-sun' : 'stroke-muted-foreground'}
              />
            </svg>

            <div className="text-sm leading-snug">
              {!prediction || prediction.status === 'pending' ? (
                <>
                  <span className="block h-4 w-14 rounded bg-muted animate-pulse motion-reduce:animate-none" />
                  <span className="mt-1 block h-3 w-20 rounded bg-muted animate-pulse motion-reduce:animate-none" />
                  <span className="sr-only">Predicting hardness</span>
                </>
              ) : prediction.status === 'error' ? (
                <>
                  <span className="block font-medium tabular-nums text-muted-foreground">—</span>
                  <span className="block text-xs text-muted-foreground">No prediction</span>
                </>
              ) : (
                <>
                  <span className="block font-medium tabular-nums text-foreground">
                    {formatNewtons(prediction.value.hardness_40m)} N
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${doneAfter ? 'text-cooked' : 'text-muted-foreground'}`}>
                    <span
                      aria-hidden="true"
                      className={`inline-block h-1.5 w-1.5 rounded-full ${doneAfter ? 'bg-cooked' : 'border border-muted-foreground'}`}
                    />
                    {doneAfter ? `Cooked in ${doneAfter} min` : 'Not cooked'}
                  </span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
