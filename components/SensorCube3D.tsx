"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";

// Dynamically import Plotly to avoid SSR document/window undefined errors in Next.js 15
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface SensorCube3DProps {
  title: string;
  sensorData: number[];
  colorScale: string;
  unit: string;
}

export const SensorCube3D = memo(function SensorCube3D({ title, sensorData, colorScale, unit }: SensorCube3DProps) {
  const X = [-1, 1, -1, 1, -1, 1, -1, 1, 0];
  const Y = [-1, -1, 1, 1, -1, -1, 1, 1, 0];
  const Z = [-1, -1, -1, -1, 1, 1, 1, 1, 0];


  return (
    <Card className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 relative min-h-[300px]">
        {sensorData && sensorData.length === 9 ? (
          <div className="absolute inset-0">
            <Plot
              data={[
                {
                  type: "scatter3d",
                  mode: "markers",
                  x: X,
                  y: Y,
                  z: Z,
                  marker: {
                    color: sensorData,
                    colorscale: colorScale,
                    size: 10,
                    showscale: false,
                  },
                },
                {
                  type: "mesh3d",
                  x: X,
                  y: Y,
                  z: Z,
                  // @ts-ignore: intensity is valid for mesh3d but may be missing in @types/plotly.js
                  intensity: sensorData,
                  // @ts-ignore: intensitymode is valid for mesh3d
                  intensitymode: "vertex",
                  colorscale: colorScale,
                  opacity: 0.4,
                  alphahull: 0,
                  showscale: true,
                  colorbar: { title: { text: unit } },
                },
              ]}
              layout={{
                uirevision: "true",
                autosize: true,
                margin: { l: 10, r: 70, b: 20, t: 30, pad: 0 },
                scene: {
                  xaxis: { title: { text: "X (Width)" }, showticklabels: false, showgrid: false, zeroline: false },
                  yaxis: { title: { text: "Y (Depth)" }, showticklabels: false, showgrid: false, zeroline: false },
                  zaxis: { title: { text: "Z (Height)" }, showticklabels: false, showgrid: false, zeroline: false },
                  camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.2 }
                  }
                },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
              }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Waiting for data...
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.colorScale !== nextProps.colorScale) return false;
  if (prevProps.unit !== nextProps.unit) return false;
  if (!prevProps.sensorData || !nextProps.sensorData) return false;
  if (prevProps.sensorData.length !== nextProps.sensorData.length) return false;
  for (let i = 0; i < prevProps.sensorData.length; i++) {
    if (prevProps.sensorData[i] !== nextProps.sensorData[i]) return false;
  }
  return true;
});
