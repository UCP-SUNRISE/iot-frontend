"use client";

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatClock, type EnvironmentPoint } from '@/hooks/usePredictionsDashboard';

interface EnvironmentalChartProps {
  environment: EnvironmentPoint[];
}

const UNITS: Record<string, string> = {
  solar_radiation: 'W/m²',
  ambient_temp: '°C',
  humidity: '%',
};

function threeHourTicks(points: EnvironmentPoint[]): number[] {
  const first = points[0]?.t, last = points[points.length - 1]?.t;
  if (first === undefined || last === undefined) return [];
  const start = new Date(first);
  start.setHours(Math.ceil((start.getHours() + start.getMinutes() / 60) / 3) * 3, 0, 0, 0);
  const ticks: number[] = [];
  for (let t = start.getTime(); t <= last; t += 3 * 3600000) ticks.push(t);
  return ticks;
}

/** Full weather forecast for the day: the model's inputs, shown on demand. */
export function EnvironmentalChart({ environment }: EnvironmentalChartProps) {
  if (environment.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No weather forecast for this day.</p>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={environment} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatClock}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            ticks={threeHourTicks(environment)}
          />
          <YAxis
            yAxisId="solar"
            domain={[0, 'auto']}
            stroke="var(--sun)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            domain={['auto', 'auto']}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(val) => `${val} °C`}
          />
          {/* Own 0–100 % scale so humidity isn't read off the °C axis; hidden and zero-width so it doesn't displace the others. */}
          <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} width={0} hide />
          <Tooltip
            labelFormatter={(t) => formatClock(Number(t))}
            formatter={(value, name, item) => {
              const key = String(item?.dataKey ?? '');
              return [`${Number(value).toFixed(key === 'solar_radiation' ? 0 : 1)} ${UNITS[key] ?? ''}`, name];
            }}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--popover)',
              color: 'var(--popover-foreground)',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: 13 }} />

          <Area
            yAxisId="solar"
            type="monotone"
            dataKey="solar_radiation"
            name="Solar radiation (W/m²)"
            fill="var(--sun)"
            stroke="var(--sun)"
            fillOpacity={0.15}
            isAnimationActive={false}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="ambient_temp"
            name="Air temperature"
            stroke="var(--foreground)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            name="Humidity (%)"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
