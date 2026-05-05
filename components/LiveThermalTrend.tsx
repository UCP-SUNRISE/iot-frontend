"use client";

import { useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThermalLineChart } from "./ThermalLineChart";

export function LiveThermalTrend() {
  const { chartData, experimentStatus, queryDb, isConnected, liveData } = useMqtt();

  // Hydrate chart on mount or when experiment becomes active
  useEffect(() => {
    if (isConnected && experimentStatus.active && experimentStatus.sessionId) {
      queryDb("get_live_chart", { session_id: experimentStatus.sessionId });
    }
  }, [isConnected, experimentStatus.active, experimentStatus.sessionId, queryDb]);

  const history = chartData.map(d => {
    const ms = typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : d.timestamp;

    let timeStr = "";
    if (ms > 1000000000000) {
      timeStr = new Date(ms).toLocaleTimeString([], { hour12: false });
    } else {
      timeStr = new Date(ms).toISOString().substring(11, 19);
    }

    return {
      time: timeStr,
      food: d.food_temp,
      water: d.water_temp
    };
  });

  return (
    <Card className="w-full h-full min-h-[500px] flex flex-col overflow-hidden">
      <CardHeader className="pb-0 pt-6 px-6">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Live Thermal Trend
            </CardTitle>
            <CardDescription>
              {experimentStatus.active
                ? `Tracking Session: ${experimentStatus.sessionId}`
                : `Final Result: ${experimentStatus.sessionId ?? 'Unknown Session'}`
              }
            </CardDescription>
          </div>

          {/* Real-time Metrics Injection */}
          <div className="flex gap-8">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Water</span>
              <span className="text-4xl font-bold text-blue-500 tabular-nums">
                {liveData?.core?.water_temp != null ? `${liveData.core.water_temp.toFixed(1)}°C` : "--.-°C"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Food</span>
              <span className="text-4xl font-bold text-orange-500 tabular-nums">
                {liveData?.core?.food_temp != null ? `${liveData.core.food_temp.toFixed(1)}°C` : "--.-°C"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-6 relative min-h-[350px]">
        {history.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {!experimentStatus.sessionId
              ? "Waiting for session to start..."
              : experimentStatus.active
                ? "Buffering telemetry..."
                : "No data available."
            }
          </div>
        ) : (
          <div className="absolute inset-0 p-6">
            <ThermalLineChart data={history.map(h => ({ time: h.time, water: h.water, food: h.food }))} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
