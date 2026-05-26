"use client";

import React from 'react';
import { usePredictionsDashboard } from '@/hooks/usePredictionsDashboard';
import { DashboardHeader } from '@/components/predictions/DashboardHeader';
import { EnvironmentalChart } from '@/components/predictions/EnvironmentalChart';
import { SimulationControls } from '@/components/predictions/SimulationControls';
import { PredictionCurvesChart } from '@/components/predictions/PredictionCurvesChart';
import { PredictionResult } from '@/components/predictions/PredictionResult';

export default function PredictionsDashboard() {
  const {
    selectedDate,
    setSelectedDate,
    minStartTime,
    setMinStartTime,
    hoveredCurveId,
    setHoveredCurveId,
    selectedCurveId,
    predictedHardness,
    isForecasting,
    forecastData,
    isPredicting,
    handleCurveSelect,
    filteredWindows,
    refetchForecast
  } = usePredictionsDashboard();

  return (
    <div className="min-h-screen bg-background font-sans py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-none space-y-8">
        <DashboardHeader
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />

        <EnvironmentalChart
          forecastData={forecastData}
          isForecasting={isForecasting}
          onRefresh={refetchForecast}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <SimulationControls
              minStartTime={minStartTime}
              setMinStartTime={setMinStartTime}
            />
            <PredictionResult
              predictedHardness={predictedHardness}
              isPredicting={isPredicting}
            />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <PredictionCurvesChart
              filteredWindows={filteredWindows}
              isForecasting={isForecasting}
              hoveredCurveId={hoveredCurveId}
              setHoveredCurveId={setHoveredCurveId}
              selectedCurveId={selectedCurveId}
              handleCurveSelect={handleCurveSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
