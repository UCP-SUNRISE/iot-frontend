"use client";

import React from 'react';
import type { CookingWindow, WindowPrediction } from '@/hooks/usePredictionsDashboard';
import { COOKING_DURATIONS, cookedAfter, formatNewtons } from './hardness';
import { CookedThresholdInput } from './CookedThresholdInput';

interface PredictionResultProps {
  window: CookingWindow | undefined;
  prediction: WindowPrediction | undefined;
  pendingCount: number;
  totalCount: number;
  isForecasting: boolean;
  thresholdN: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function PredictionResult({
  window: w,
  prediction,
  pendingCount,
  totalCount,
  isForecasting,
  thresholdN,
}: PredictionResultProps) {
  const done = prediction?.status === 'done' ? prediction.value : null;
  const cookedAt = done ? cookedAfter(done, thresholdN) : null;

  // Shared scale for the three bars, always leaving room to show the threshold mark.
  const scaleMax = done
    ? Math.max(thresholdN, done.hardness_20m, done.hardness_30m, done.hardness_40m) * 1.08
    : thresholdN * 1.5;

  let body: React.ReactNode;

  if (!w) {
    const finished = totalCount - pendingCount;
    body = isForecasting ? (
      <p className="text-sm text-muted-foreground">Waiting for the water-temperature forecast…</p>
    ) : totalCount === 0 ? (
      <p className="text-sm text-muted-foreground">Pick a day with a forecast to see predicted hardness.</p>
    ) : pendingCount > 0 ? (
      <div>
        <p className="text-sm text-foreground">Predicting hardness for every start time…</p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={finished}>
          <div className="h-full bg-sun transition-[width]" style={{ width: `${(finished / totalCount) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">{finished} of {totalCount} done. The softest start time will be selected for you.</p>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Choose a start time above to see how tender the chickpeas will be.</p>
    );
  } else {
    body = (
      <>
        <div>
          <p className="text-sm text-muted-foreground">Start cooking at <span className="font-semibold text-sun tabular-nums">{w.label}</span></p>
          {done ? (
            <p className={`mt-1 text-2xl font-semibold tracking-tight ${cookedAt ? 'text-cooked' : 'text-foreground'}`}>
              {cookedAt ? `Cooked after ${cookedAt} min` : 'Not cooked within 40 min'}
            </p>
          ) : prediction?.status === 'error' ? (
            <p className="mt-1 text-sm text-destructive">Couldn&apos;t predict hardness for this start time. Refresh the forecast to try again.</p>
          ) : (
            <span className="mt-2 block h-7 w-48 rounded bg-muted animate-pulse motion-reduce:animate-none" />
          )}
        </div>

        {prediction?.status !== 'error' && (
          <dl className="mt-6 space-y-4">
            {COOKING_DURATIONS.map(({ minutes, key }) => {
              const value = done?.[key];
              const isCooked = value !== undefined && value <= thresholdN;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{minutes} min</dt>
                    <dd className="tabular-nums">
                      {value === undefined ? (
                        <span className="inline-block h-4 w-16 rounded bg-muted animate-pulse motion-reduce:animate-none" />
                      ) : (
                        <>
                          <span className="font-semibold text-foreground">{formatNewtons(value)} N</span>
                          <span className={`ml-2 text-xs ${isCooked ? 'text-cooked' : 'text-muted-foreground'}`}>
                            {isCooked ? 'Cooked' : 'Not yet'}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-muted" aria-hidden="true">
                    {value !== undefined && (
                      <div
                        className={`h-full rounded-full ${isCooked ? 'bg-cooked' : 'bg-muted-foreground/60'}`}
                        style={{ width: `${Math.min(100, (value / scaleMax) * 100)}%` }}
                      />
                    )}
                    <div
                      className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground"
                      style={{ left: `${(thresholdN / scaleMax) * 100}%` }}
                      title={`Cooked threshold: ${formatNewtons(thresholdN)} N`}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Water peaks at {w.peakTemp.toFixed(0)} °C
          {w.minutesAbove90 > 0 ? ` and stays above 90 °C for ${formatDuration(w.minutesAbove90)}.` : ' and never reaches 90 °C.'}
        </p>
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1" aria-live="polite">{body}</div>

      <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
        <label htmlFor="result-cooked-threshold" className="flex flex-wrap items-center justify-between gap-2">
          <span>Counts as cooked at or below</span>
          <CookedThresholdInput id="result-cooked-threshold" />
        </label>
        <p className="mt-2">Lower hardness means softer chickpeas. The bar mark shows the threshold.</p>
      </div>
    </div>
  );
}
