import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMqtt } from '@/contexts/MqttContext';
import { toast } from 'sonner';

// The forecast chain (Open-Meteo fetch + predictions for every cooking window)
// can exceed the default RPC timeout, especially on the Raspberry Pi.
const FORECAST_TIMEOUT_MS = 45000;
// Hardness is predicted for every window up front; cap parallel requests so the Pi isn't flooded.
const PREDICT_CONCURRENCY = 4;
const BOIL_REFERENCE_C = 90;

export interface ForecastPoint {
  timestamp: string;
  ambient_temp?: number | null;
  humidity?: number | null;
  solar_radiation?: number | null;
  predicted_water_temp?: number | null;
}

interface RawTimeWindow {
  id: string;
  start_time: string;
  water_temp_curve: ForecastPoint[];
}

interface ForecastResponse {
  environmental_forecast?: ForecastPoint[];
  time_windows?: RawTimeWindow[];
}

export interface Hardness {
  hardness_20m: number;
  hardness_30m: number;
  hardness_40m: number;
}

export type WindowPrediction =
  | { status: 'pending' }
  | { status: 'done'; value: Hardness }
  | { status: 'error' };

export interface CurvePoint { t: number; temp: number }

export interface CookingWindow {
  id: string;
  /** Start time as HH:mm. */
  label: string;
  points: CurvePoint[];
  peakTemp: number;
  minutesAbove90: number;
  raw: RawTimeWindow;
}

export interface EnvironmentPoint {
  t: number;
  ambient_temp: number | null;
  humidity: number | null;
  solar_radiation: number | null;
}

/** "2026-09-28 12:34:00" → epoch ms, read as local time like the rest of the dashboard. */
export function parseTimestamp(value: string): number {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T')).getTime();
}

export function formatClock(t: number): string {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toCookingWindow(raw: RawTimeWindow): CookingWindow {
  const points: CurvePoint[] = raw.water_temp_curve
    .filter(p => p.predicted_water_temp != null)
    .map(p => ({ t: parseTimestamp(p.timestamp), temp: p.predicted_water_temp as number }));

  let minutesAbove90 = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].temp >= BOIL_REFERENCE_C && points[i - 1].temp >= BOIL_REFERENCE_C) {
      minutesAbove90 += (points[i].t - points[i - 1].t) / 60000;
    }
  }

  const start = raw.start_time || raw.id;
  return {
    id: raw.id,
    label: /^\d{1,2}:\d{2}/.test(start) ? start.slice(0, 5) : points[0] ? formatClock(points[0].t) : start,
    points,
    peakTemp: points.reduce((max, p) => Math.max(max, p.temp), -Infinity),
    minutesAbove90: Math.round(minutesAbove90),
    raw,
  };
}

export function usePredictionsDashboard() {
  const { makeRpcCall, isConnected } = useMqtt();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, WindowPrediction>>({});
  // Null until the user picks a window; until then the recommended one is shown.
  const [pickedWindowId, setPickedWindowId] = useState<string | null>(null);
  const [hoveredWindowId, setHoveredWindowId] = useState<string | null>(null);

  // Bumped on every forecast so results from an older date are ignored.
  const generationRef = useRef(0);

  const windows = useMemo<CookingWindow[]>(
    () => (forecastData?.time_windows ?? []).map(toCookingWindow).filter(w => w.points.length > 0),
    [forecastData]
  );

  const environment = useMemo<EnvironmentPoint[]>(
    () => (forecastData?.environmental_forecast ?? []).map(p => ({
      t: parseTimestamp(p.timestamp),
      ambient_temp: p.ambient_temp ?? null,
      humidity: p.humidity ?? null,
      solar_radiation: p.solar_radiation ?? null,
    })),
    [forecastData]
  );

  const predictAll = useCallback(async (targets: CookingWindow[], generation: number) => {
    setPredictions(Object.fromEntries(targets.map(w => [w.id, { status: 'pending' } as WindowPrediction])));
    let failures = 0;
    const queue = [...targets];

    const worker = async () => {
      for (let w = queue.shift(); w; w = queue.shift()) {
        let result: WindowPrediction;
        try {
          const response = await makeRpcCall<Partial<Hardness> | null>(
            'sunrise/ml/predict/request',
            'sunrise/ml/predict/response',
            w.raw
          );
          const { hardness_20m, hardness_30m, hardness_40m } = response ?? {};
          result = hardness_20m !== undefined && hardness_30m !== undefined && hardness_40m !== undefined
            ? { status: 'done', value: { hardness_20m, hardness_30m, hardness_40m } }
            : { status: 'error' };
        } catch {
          result = { status: 'error' };
        }
        if (generationRef.current !== generation) return;
        if (result.status === 'error') failures++;
        const id = w.id;
        setPredictions(prev => ({ ...prev, [id]: result }));
      }
    };

    await Promise.all(Array.from({ length: Math.min(PREDICT_CONCURRENCY, targets.length) }, worker));
    if (generationRef.current === generation && failures > 0) {
      toast.error(`Couldn't predict hardness for ${failures} of ${targets.length} start times`);
    }
  }, [makeRpcCall]);

  const fetchForecast = useCallback(async () => {
    if (!selectedDate) return;
    const generation = ++generationRef.current;
    try {
      setIsForecasting(true);
      setPickedWindowId(null);
      setPredictions({});
      const response = await makeRpcCall<ForecastResponse>(
        'sunrise/ml/forecast/request',
        'sunrise/ml/forecast/response',
        { date: selectedDate },
        { timeoutMs: FORECAST_TIMEOUT_MS }
      );
      if (generationRef.current !== generation) return;
      setForecastData(response);
      setIsForecasting(false);
      const targets = (response?.time_windows ?? []).map(toCookingWindow).filter(w => w.points.length > 0);
      await predictAll(targets, generation);
    } catch (error: unknown) {
      if (generationRef.current === generation) {
        toast.error(error instanceof Error ? error.message : 'Failed to load forecast');
      }
    } finally {
      if (generationRef.current === generation) setIsForecasting(false);
    }
  }, [selectedDate, makeRpcCall, predictAll]);

  // Wait for the broker connection — opening /predictions directly would
  // otherwise fire the request before MQTT connects and never retry it.
  useEffect(() => {
    if (isConnected) fetchForecast();
  }, [isConnected, fetchForecast]);

  const recommendedWindowId = useMemo(() => {
    let best: { id: string; value: number } | null = null;
    for (const w of windows) {
      const p = predictions[w.id];
      if (p?.status === 'done' && (best === null || p.value.hardness_40m < best.value)) {
        best = { id: w.id, value: p.value.hardness_40m };
      }
    }
    return best?.id ?? null;
  }, [windows, predictions]);

  const pendingCount = useMemo(
    () => Object.values(predictions).filter(p => p.status === 'pending').length,
    [predictions]
  );

  // Until the user picks one, show the softest window once every prediction is in.
  const effectiveSelectedId = pickedWindowId ?? (pendingCount === 0 ? recommendedWindowId : null);

  return {
    selectedDate,
    setSelectedDate,
    isForecasting,
    windows,
    environment,
    predictions,
    pendingCount,
    recommendedWindowId,
    selectedWindowId: effectiveSelectedId,
    selectWindow: setPickedWindowId,
    hoveredWindowId,
    setHoveredWindowId,
    refetchForecast: fetchForecast,
  };
}
