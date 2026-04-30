"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Dynamically import Plotly to prevent SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

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

  const times = history.map(d => d.time);
  const foodTemps = history.map(d => d.food);
  const waterTemps = history.map(d => d.water);

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
            {experimentStatus.active ? "Buffering telemetry..." : "No data available."}
          </div>
        ) : (
          <div className="absolute inset-0">
            <Plot
              data={[
                {
                  x: times,
                  y: waterTemps,
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'Water Temp',
                  line: { color: '#0ea5e9', width: 3 }, // Sky Blue
                  marker: { size: 6 }
                },
                {
                  x: times,
                  y: foodTemps,
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'Food Temp',
                  line: { color: '#f97316', width: 3 }, // Orange
                  marker: { size: 6 }
                }
              ]}
              layout={{
                uirevision: 'true', // Preserve zoom/pan state during live updates
                autosize: true,
                margin: { l: 40, r: 20, t: 30, b: 60, pad: 0 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { 
                  title: { text: 'Time', font: { size: 10 } },
                  showgrid: true,
                  gridcolor: 'rgba(255,255,255,0.05)',
                  tickangle: -45,
                  tickfont: { size: 10 }
                },
                yaxis: { 
                  title: { text: 'Temp (°C)', font: { size: 10 } },
                  showgrid: true,
                  gridcolor: 'rgba(255,255,255,0.05)',
                  tickfont: { size: 10 }
                },
                legend: {
                  orientation: 'h',
                  yanchor: 'bottom',
                  y: 1.02,
                  xanchor: 'right',
                  x: 1,
                  font: { size: 10 }
                },
                font: { color: '#a1a1aa' } // Tailwind's zinc-400
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
