"use client";

import { useEffect, useRef, useState } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

export function ExperimentTimer() {
  const { experimentStatus } = useMqtt();
  const [elapsed, setElapsed] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer first
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (experimentStatus.active && experimentStatus.startTimestamp) {
      const start = experimentStatus.startTimestamp; // Unix ms

      const tick = () => setElapsed(Date.now() - start);
      tick(); // immediate first tick to avoid 1s delay
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [experimentStatus.active, experimentStatus.startTimestamp]);

  if (!experimentStatus.active) return null;

  return (
    <Card className="text-center">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Session Elapsed
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-foreground">
          {formatElapsed(elapsed)}
        </p>
        {experimentStatus.sessionId && (
          <p className="mt-2 text-xs text-muted-foreground font-mono truncate">
            {experimentStatus.sessionId}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
