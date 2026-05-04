"use client";

import { useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThermalLineChart } from "./ThermalLineChart";

interface ChartPoint {
  time: string;
  food: number | null;
  water: number | null;
}

export function ExperimentLiveChart() {
  const { chartData, experimentStatus, queryDb, isConnected } = useMqtt();

  // Hydrate chart on mount or when experiment becomes active
  useEffect(() => {
    if (isConnected && experimentStatus.active && experimentStatus.sessionId) {
      queryDb("get_live_chart", { session_id: experimentStatus.sessionId });
    }
  }, [isConnected, experimentStatus.active, experimentStatus.sessionId, queryDb]);

  // If no experiment is active and we have no history, do not render anything inside the plot space
  const history = chartData.map(d => {
    const ms = typeof d.timestamp === 'string' ? new Date(d.timestamp).getTime() : d.timestamp;

    let timeStr = "";
    if (ms > 1000000000000) {
      timeStr = new Date(ms).toLocaleTimeString([], { hour12: false });
    } else {
      // Fallback for uptime-style MS if they exist in chartData
      timeStr = new Date(ms).toISOString().substring(11, 19);
    }

    return {
      time: timeStr,
      food: d.food_temp,
      water: d.water_temp
    };
  });

  return (
    <Card className="w-full h-full min-h-[400px] flex flex-col overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Live Thermal Trend
        </CardTitle>
        <CardDescription>
          {experimentStatus.active
            ? `Tracking Session: ${experimentStatus.sessionId}`
            : `Final Result: ${experimentStatus.sessionId ?? 'Unknown Session'}`
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow p-0 relative min-h-[300px]">
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
          <div className="absolute inset-0">
            <ThermalLineChart data={history.map(h => ({ time: h.time, water: h.water, food: h.food }))} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
