"use client";

import { useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { withPageAuthRequired, useUser } from "@auth0/nextjs-auth0/client";
import { SensorCube3D } from "@/components/SensorCube3D";
import { ExperimentControls } from "@/components/ExperimentControls";
import { LiveThermalTrend } from "@/components/LiveThermalTrend";
import { ExperimentTimer } from "@/components/ExperimentTimer";
import { LiveLogs } from "@/components/LiveLogs";
import { ExperimentHistory } from "@/components/ExperimentHistory";

export default withPageAuthRequired(function DashboardPage() {
  const { isLoading } = useUser();
  const { isConnected, connectionStatus, liveData, subscribe, unsubscribe } = useMqtt();

  useEffect(() => {
    if (isConnected) {
      subscribe("sunrise/oven/+/live");
      return () => unsubscribe("sunrise/oven/+/live");
    }
  }, [isConnected, subscribe, unsubscribe]);

  if (!isLoading && !isConnected && (connectionStatus === 'connecting')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p>Connecting to Edge Server...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8 flex-grow flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls & Logs */}
        <div className="lg:col-span-1 space-y-6">
          <ExperimentControls />
          <ExperimentTimer />
          <LiveLogs />
        </div>

        {/* Right Column: Live Trend & 3D Cubes */}
        <div className="lg:col-span-2 space-y-8">
          <LiveThermalTrend />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[300px]">
            <SensorCube3D
              title="Temperature (°C)"
              sensorData={liveData?.cube_th ?? []}
              dataKey="t"
              colorScale="Hot"
              unit="°C"
            />
            <SensorCube3D
              title="Humidity (%)"
              sensorData={liveData?.cube_th ?? []}
              dataKey="h"
              colorScale="Blues"
              unit="%"
            />
            <SensorCube3D
              title="Light (Lux)"
              sensorData={liveData?.cube_light ?? []}
              dataKey="lux"
              colorScale="Viridis"
              unit="LUX"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="pt-8 border-t">
        <ExperimentHistory />
      </div>
    </main>
  );
});
