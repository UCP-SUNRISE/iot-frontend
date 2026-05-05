"use client";

import { useEffect, useRef, useState } from "react";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

export function useExperimentTimer(active: boolean, startTimestamp?: number | null) {
  const [elapsed, setElapsed] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer first
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (active && startTimestamp) {
      const tick = () => setElapsed(Date.now() - startTimestamp);
      tick(); // immediate first tick to avoid 1s delay
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, startTimestamp]);

  return formatElapsed(elapsed);
}
