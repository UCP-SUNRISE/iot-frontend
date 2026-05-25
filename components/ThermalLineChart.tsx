"use client";

import dynamic from "next/dynamic";

// Dynamically import Plotly to prevent SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ThermalPoint {
  time: string;
  water: number | null;
  food: number | null;
  solar_radiation?: number | null;
}

interface ThermalLineChartProps {
  data: ThermalPoint[];
}

export function ThermalLineChart({ data }: ThermalLineChartProps) {
  const times = data.map(d => d.time);
  const waterTemps = data.map(d => d.water);
  const foodTemps = data.map(d => d.food);
  const solarTemps = data.map(d => d.solar_radiation ?? null);

  return (
    <div className="w-full h-full min-h-[300px]">
      <Plot
        data={[
          {
            x: times,
            y: waterTemps,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Water Temp',
            line: { color: '#0ea5e9', width: 3 },
            marker: { size: 6 }
          },
          {
            x: times,
            y: foodTemps,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Food Temp',
            line: { color: '#f97316', width: 3 },
            marker: { size: 6 }
          },
          {
            x: times,
            y: solarTemps,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Solar Radiation',
            yaxis: 'y2',
            line: { color: '#eab308', width: 3 }, // yellow-500
            marker: { size: 6 }
          }
        ]}
        layout={{
          uirevision: 'true',
          autosize: true,
          margin: { l: 40, r: 45, t: 30, b: 60, pad: 0 },
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
          yaxis2: {
            title: { text: 'Solar (W/m²)', font: { size: 10 } },
            overlaying: 'y',
            side: 'right',
            showgrid: false,
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
          font: { color: '#a1a1aa' }
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
}
