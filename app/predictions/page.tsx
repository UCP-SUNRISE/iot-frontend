"use client";

import React from 'react';
import { usePredictionsDashboard } from '@/hooks/usePredictionsDashboard';
import { useCookedThreshold } from '@/contexts/SettingsContext';
import { DashboardHeader } from '@/components/predictions/DashboardHeader';
import { StartTimePicker } from '@/components/predictions/StartTimePicker';
import { PredictionCurvesChart } from '@/components/predictions/PredictionCurvesChart';
import { PredictionResult } from '@/components/predictions/PredictionResult';

export default function PredictionsDashboard() {
  const {
    selectedDate,
    setSelectedDate,
    isForecasting,
    windows,
    environment,
    predictions,
    pendingCount,
    recommendedWindowId,
    selectedWindowId,
    selectWindow,
    hoveredWindowId,
    setHoveredWindowId,
    refetchForecast,
  } = usePredictionsDashboard();
  const [thresholdN] = useCookedThreshold();

  const selectedWindow = windows.find(w => w.id === selectedWindowId);

  return (
    <div className="min-h-screen bg-background font-sans py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-none space-y-6">
        <DashboardHeader
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          environment={environment}
          isForecasting={isForecasting}
          onRefresh={refetchForecast}
        />

        <section aria-labelledby="start-time-heading" className="bg-card text-card-foreground rounded-lg border border-border p-6">
          <h2 id="start-time-heading" className="text-xl font-bold">Choose a start time</h2>
          <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
            Each start time has its own predicted heating curve. Pick one to see how hard the chickpeas will be; the softest is selected for you.
          </p>
          {windows.length > 0 ? (
            <StartTimePicker
              windows={windows}
              predictions={predictions}
              selectedWindowId={selectedWindowId}
              recommendedWindowId={recommendedWindowId}
              hoveredWindowId={hoveredWindowId}
              onSelect={selectWindow}
              onHover={setHoveredWindowId}
              thresholdN={thresholdN}
            />
          ) : (
            <div className="flex gap-3 overflow-hidden pb-3" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className={`h-[8.25rem] w-[9.25rem] shrink-0 rounded-lg border border-border bg-muted/30 ${isForecasting ? 'animate-pulse motion-reduce:animate-none' : ''}`}
                />
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section aria-labelledby="curves-heading" className="lg:col-span-8 bg-card text-card-foreground rounded-lg border border-border p-6">
            <h2 id="curves-heading" className="text-xl font-bold">Water temperature in the cooker</h2>
            <p className="mt-1 mb-4 max-w-prose text-sm text-muted-foreground">
              The highlighted line is your start time. Grey lines are the others; click near one to switch to it.
            </p>
            <PredictionCurvesChart
              windows={windows}
              environment={environment}
              isForecasting={isForecasting}
              selectedWindowId={selectedWindowId}
              hoveredWindowId={hoveredWindowId}
              onSelect={selectWindow}
              onHover={setHoveredWindowId}
            />
          </section>

          <section aria-labelledby="hardness-heading" className="lg:col-span-4 flex flex-col bg-card text-card-foreground rounded-lg border border-border p-6">
            <h2 id="hardness-heading" className="mb-4 text-xl font-bold">Predicted hardness</h2>
            <PredictionResult
              window={selectedWindow}
              prediction={selectedWindowId ? predictions[selectedWindowId] : undefined}
              pendingCount={pendingCount}
              totalCount={windows.length}
              isForecasting={isForecasting}
              thresholdN={thresholdN}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
