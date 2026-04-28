"use client";

import { useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { SystemHealth } from "@/components/SystemHealth";
import { CoreReadings } from "@/components/CoreReadings";
import { SensorCube3D } from "@/components/SensorCube3D";

export default function DashboardPage() {
  const { isConnected, liveData, subscribe, unsubscribe } = useMqtt();

  useEffect(() => {
    if (isConnected) {
      subscribe("sunrise/oven/+/live");
      return () => unsubscribe("sunrise/oven/+/live");
    }
  }, [isConnected, subscribe, unsubscribe]);

  if (!isConnected) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p>Connecting to Edge Server...</p>
        </div>
      </div>
    );
  }

  if (!liveData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p>Awaiting telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 md:p-8 space-y-8 flex-grow flex flex-col">
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">SUNRISE Solar Oven</h1>
        <p className="text-muted-foreground">Real-time Scientific Telemetry</p>
      </header>

      {/* Top Section: Health & Core Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-full">
          <SystemHealth
            isConnected={isConnected}
            deviceId={liveData.metadata.device_id}
          />
        </div>
        <div className="lg:col-span-2 h-full">
          <CoreReadings
            waterTemp={liveData.core.water_temp}
            foodTemp={liveData.core.food_temp}
          />
        </div>
      </div>

      {/* Bottom Section: 3D Visualization Cubes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
        <SensorCube3D
          title="Temperature Matrix (°C)"
          sensorData={liveData.cube_th.map(d => d.t)}
          colorScale="Hot"
        />
        <SensorCube3D
          title="Humidity Matrix (%)"
          sensorData={liveData.cube_th.map(d => d.h)}
          colorScale="Blues"
        />
        <SensorCube3D
          title="Light Intensity (Lux)"
          sensorData={liveData.cube_light}
          colorScale="Viridis"
        />
      </div>
    </main>
  );
}
