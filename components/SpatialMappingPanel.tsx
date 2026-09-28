"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SensorCube3D } from "@/components/SensorCube3D";
import { useSettings } from "@/contexts/SettingsContext";
import { TempHumidityNode, LightNode } from "@/types/telemetry";
import { cn } from "@/lib/utils";

interface SpatialMappingPanelProps {
  cubeTh: TempHumidityNode[];
  cubeLight: LightNode[];
  /** Extra context shown under the title, e.g. the scrubber position in history. */
  description?: string;
  /** Height class for the cube grid. */
  gridClassName?: string;
}

/**
 * Exploratory 3D sensor-cube view, hidden by default.
 *
 * Cube sensors are optional: when they are not fitted the ESP32 simply sends empty
 * arrays, so the panel reports whether data is arriving instead of asking the user
 * to declare which hardware is present. The cubes stay unmounted while hidden,
 * which keeps the heavy Plotly scenes off the live-update path.
 */
export function SpatialMappingPanel({ cubeTh, cubeLight, description, gridClassName }: SpatialMappingPanelProps) {
  const { settings, updateSettings } = useSettings();
  const { visible, metrics } = settings.spatial;

  const hasData = cubeTh.length > 0 || cubeLight.length > 0;
  const enabledMetrics = Object.values(metrics).filter(Boolean).length;

  const setVisible = (checked: boolean) =>
    updateSettings(prev => ({ ...prev, spatial: { ...prev.spatial, visible: checked } }));

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Spatial Mapping
            </CardTitle>
            <Badge variant="outline">Exploratory</Badge>
            <Badge variant={hasData ? "secondary" : "ghost"} className={cn(hasData && "text-green-500")}>
              {hasData ? "Cube data detected" : "No cube data"}
            </Badge>
          </div>
          <CardDescription>
            {description ?? "Temperature, humidity and light across the oven cavity."}
          </CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <span className="hidden sm:inline">Show cubes</span>
          <Switch checked={visible} onCheckedChange={setVisible} aria-label="Show sensor cubes" />
        </label>
      </CardHeader>

      {visible && (
        <CardContent>
          {enabledMetrics === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              All cube metrics are disabled. Enable them in Settings.
            </p>
          ) : (
            <div className={cn("grid grid-cols-1 gap-6", enabledMetrics > 1 && "md:grid-cols-2", enabledMetrics > 2 && "lg:grid-cols-3", gridClassName)}>
              {metrics.temperature && (
                <SensorCube3D title="Temperature (°C)" sensorData={cubeTh} dataKey="t" colorScale="Hot" unit="°C" />
              )}
              {metrics.humidity && (
                <SensorCube3D title="Humidity (%)" sensorData={cubeTh} dataKey="h" colorScale="Blues" unit="%" />
              )}
              {metrics.light && (
                <SensorCube3D title="Light (Lux)" sensorData={cubeLight} dataKey="lux" colorScale="Viridis" unit="LUX" />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
