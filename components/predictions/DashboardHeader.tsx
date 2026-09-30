"use client";

import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { formatClock, type EnvironmentPoint } from '@/hooks/usePredictionsDashboard';
import { EnvironmentalChart } from './EnvironmentalChart';

interface DashboardHeaderProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  environment: EnvironmentPoint[];
  isForecasting: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ selectedDate, setSelectedDate, environment, isForecasting, onRefresh }: DashboardHeaderProps) {
  const [showWeather, setShowWeather] = useState(false);
  const weatherId = useId();

  const summary = useMemo(() => {
    let peak: EnvironmentPoint | null = null;
    let tLo = Infinity, tHi = -Infinity;
    for (const p of environment) {
      if (p.solar_radiation != null && (!peak || p.solar_radiation > (peak.solar_radiation ?? 0))) peak = p;
      if (p.ambient_temp != null) { tLo = Math.min(tLo, p.ambient_temp); tHi = Math.max(tHi, p.ambient_temp); }
    }
    if (!peak) return null;
    return {
      peakSolar: Math.round(peak.solar_radiation ?? 0),
      peakAt: formatClock(peak.t),
      airRange: Number.isFinite(tLo) ? `${Math.round(tLo)}–${Math.round(tHi)} °C` : null,
    };
  }, [environment]);

  return (
    <header className="bg-card text-card-foreground rounded-lg border border-border p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-prose">
          <h1 className="text-3xl font-bold tracking-tight">Hardness forecast</h1>
          <p className="mt-2 text-muted-foreground">
            See how the day&apos;s sun heats the solar cooker, and how tender the chickpeas will be for each start time.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Day
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            />
          </label>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isForecasting}
            className="rounded-lg border border-input p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Refresh forecast"
            title="Refresh forecast"
          >
            <RefreshCw className={`h-5 w-5 ${isForecasting ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
        <p className="text-muted-foreground">
          {isForecasting && !summary
            ? 'Loading the weather forecast…'
            : summary
              ? <>Sun peaks at <span className="font-medium text-sun tabular-nums">{summary.peakSolar} W/m²</span> around <span className="tabular-nums text-foreground">{summary.peakAt}</span>{summary.airRange && <>, air {summary.airRange}</>}.</>
              : 'No weather forecast for this day.'}
        </p>
        {environment.length > 0 && (
          <button
            type="button"
            onClick={() => setShowWeather(v => !v)}
            aria-expanded={showWeather}
            aria-controls={weatherId}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showWeather ? 'Hide weather detail' : 'Show weather detail'}
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showWeather ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {showWeather && (
        <div id={weatherId} className="mt-4">
          <EnvironmentalChart environment={environment} />
        </div>
      )}
    </header>
  );
}
