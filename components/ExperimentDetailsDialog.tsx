"use client";

import { useEffect, useState, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { TempHumidityNode, LightNode } from "@/types/telemetry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ThermalLineChart } from "./ThermalLineChart";
import { SensorCube3D } from "./SensorCube3D";
import { toast } from "sonner";
import { exportSessionToExcel } from "@/lib/exportUtils";

interface ExperimentDetailsDialogProps {
  sessionId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperimentDetailsDialog({ sessionId, isOpen, onOpenChange }: ExperimentDetailsDialogProps) {
  const { queryDb, dbQueryResponse } = useMqtt();
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeIndex, setTimeIndex] = useState(0);

  // 1. Fetch details on mount/open
  useEffect(() => {
    if (isOpen && sessionId) {
      setIsLoading(true);
      queryDb("get_session_details", { session_id: sessionId });
    }
  }, [isOpen, sessionId, queryDb]);

  // 2. Listen for DB response
  useEffect(() => {
    if (dbQueryResponse && Array.isArray(dbQueryResponse)) {
      const resp = dbQueryResponse[0] as any;
      if (resp?.response_to === "get_session_details" && resp?.session_id === sessionId) {
        setSessionDetails(resp.data);
        setIsLoading(false);
        setTimeIndex(0);
      }
    }
  }, [dbQueryResponse, sessionId]);

  const handleExport = () => {
    if (!sessionDetails) return;
    toast.success("Generating XLSX", { description: "Preparing multi-sheet telemetry report..." });
    exportSessionToExcel(sessionDetails, sessionId || "unknown");
  };

  const currentPoint = useMemo(() => {
    if (!sessionDetails?.telemetry || sessionDetails.telemetry.length === 0) return null;
    return sessionDetails.telemetry[timeIndex];
  }, [sessionDetails, timeIndex]);

  const lineChartData = useMemo(() => {
    if (!sessionDetails?.telemetry) return [];
    return sessionDetails.telemetry.map((t: any) => ({
      time: new Date(t.timestamp).toLocaleTimeString([], { hour12: false }),
      water: t.water_temperature,
      food: t.food_temperature
    }));
  }, [sessionDetails]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/30 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Experiment: <span className="font-mono text-primary">{sessionId}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              {sessionDetails?.metadata?.start_time && (
                <span>Started: <span className="text-foreground">{new Date(sessionDetails.metadata.start_time).toLocaleString()}</span></span>
              )}
              {sessionDetails?.metadata?.end_time && (
                <span>Ended: <span className="text-foreground">{new Date(sessionDetails.metadata.end_time).toLocaleString()}</span></span>
              )}
            </DialogDescription>
          </div>
          <Button onClick={handleExport} size="sm">Export XLSX</Button>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 pb-32">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Hydrating session telemetry...</p>
              </div>
            </div>
          ) : sessionDetails ? (
            <>
              {/* Historical Trend */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historical Trend</h3>
                <div className="h-[300px] w-full border rounded-xl bg-card p-4 shadow-sm">
                  <ThermalLineChart data={lineChartData} />
                </div>
              </div>

              {/* Spatial Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spatial Data (Point {timeIndex + 1}/{sessionDetails.telemetry.length})</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                  <SensorCube3D
                    title="Point-in-Time Thermal"
                    sensorData={(currentPoint?.cube_th ?? []) as TempHumidityNode[]}
                    dataKey="t"
                    colorScale="Hot"
                    unit="°C"
                  />
                  <SensorCube3D
                    title="Point-in-Time Humidity"
                    sensorData={(currentPoint?.cube_th ?? []) as TempHumidityNode[]}
                    dataKey="h"
                    colorScale="Blues"
                    unit="%"
                  />
                  <SensorCube3D
                    title="Point-in-Time Light"
                    sensorData={(currentPoint?.cube_light ?? []) as LightNode[]}
                    dataKey="lux"
                    colorScale="Viridis"
                    unit="LUX"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a session to view details.
            </div>
          )}
        </div>

        {/* The Scrubber: Sticky to bottom of dialog content */}
        {sessionDetails && sessionDetails.telemetry.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">START</span>
                <div className="text-center">
                  <span className="text-xs font-semibold text-foreground">
                    Telemetry Timestamp: <span className="text-primary font-mono">{currentPoint?.timestamp ? new Date(currentPoint.timestamp).toLocaleTimeString() : '—'}</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">END</span>
              </div>
              <Slider
                defaultValue={[0]}
                max={sessionDetails.telemetry.length - 1}
                step={1}
                value={[timeIndex]}
                onValueChange={(val) => setTimeIndex(val[0])}
                className="w-full"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
