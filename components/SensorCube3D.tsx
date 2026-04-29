"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo, useMemo } from "react";

import { SpatialNode } from '@/types/telemetry';

// Dynamically import Plotly to avoid SSR document/window undefined errors in Next.js 15
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export interface SensorCube3DProps<T extends SpatialNode> {
  title: string;
  sensorData: T[];
  dataKey: keyof Omit<T, keyof SpatialNode>;
  colorScale: string;
  unit: string;
}

const SensorCube3DInner = <T extends SpatialNode>({ title, sensorData, dataKey, colorScale, unit }: SensorCube3DProps<T>) => {
  const X = useMemo(() => sensorData?.map(node => node.x) || [], [sensorData])
  const Y = useMemo(() => sensorData?.map(node => node.y) || [], [sensorData])
  const Z = useMemo(() => sensorData?.map(node => node.z) || [], [sensorData])
  const values = useMemo(() => sensorData?.map(node => node[dataKey] as number) || [], [sensorData])

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
                    color: values,
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
                  intensity: values,
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
};

export const SensorCube3D = memo(SensorCube3DInner, (prevProps: any, nextProps: any) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.colorScale !== nextProps.colorScale) return false;
  if (prevProps.unit !== nextProps.unit) return false;
  if (prevProps.dataKey !== nextProps.dataKey) return false;
  if (!prevProps.sensorData || !nextProps.sensorData) return false;
  if (prevProps.sensorData.length !== nextProps.sensorData.length) return false;
  for (let i = 0; i < prevProps.sensorData.length; i++) {
    if (prevProps.sensorData[i][prevProps.dataKey] !== nextProps.sensorData[i][nextProps.dataKey]) return false;
  }
  return true;
}) as typeof SensorCube3DInner;
