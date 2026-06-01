import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMqtt } from '@/contexts/MqttContext';
import { toast } from 'sonner';

export function usePredictionsDashboard() {
  const { makeRpcCall } = useMqtt();

  // Forecast state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [minStartTime, setMinStartTime] = useState<string>("00:00");
  const [hoveredCurveId, setHoveredCurveId] = useState<string | null>(null);
  const [selectedCurveId, setSelectedCurveId] = useState<string | null>(null);
  const [predictedHardness, setPredictedHardness] = useState<{ hardness_20m: number, hardness_30m: number, hardness_40m: number } | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastData, setForecastData] = useState<{ environmental_forecast?: any[], time_windows?: any[] } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const fetchForecast = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setIsForecasting(true);
      const response = await makeRpcCall<any>(
        'sunrise/ml/forecast/request',
        'sunrise/ml/forecast/response',
        { date: selectedDate }
      );
      setForecastData(response);
      setSelectedCurveId(null);
      setPredictedHardness(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load forecast');
    } finally {
      setIsForecasting(false);
    }
  }, [selectedDate, makeRpcCall]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const handleCurveSelect = async (curve: any) => {
    setSelectedCurveId(curve.id);
    try {
      setIsPredicting(true);
      const response = await makeRpcCall<any>(
        'sunrise/ml/predict/request',
        'sunrise/ml/predict/response',
        curve
      );
      const hardnessValue = response?.hardness_20m !== undefined ? {
        hardness_20m: response.hardness_20m,
        hardness_30m: response.hardness_30m,
        hardness_40m: response.hardness_40m
      } : null;
      setPredictedHardness(hardnessValue);
      toast.success('Prediction generated successfully');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to run prediction');
    } finally {
      setIsPredicting(false);
    }
  };

  const filteredWindows = useMemo(() => {
    if (!forecastData?.time_windows) return [];
    return forecastData.time_windows.filter((window: any) => {
      const curveStartTime = window.start_time || window.data?.[0]?.timestamp;
      // String comparison for 'HH:MM:SS' or 'HH:MM' >= 'HH:MM' works correctly
      if (!curveStartTime) return false;
      return curveStartTime >= minStartTime;
    });
  }, [forecastData, minStartTime]);

  return {
    selectedDate,
    setSelectedDate,
    minStartTime,
    setMinStartTime,
    hoveredCurveId,
    setHoveredCurveId,
    selectedCurveId,
    setSelectedCurveId,
    predictedHardness,
    setPredictedHardness,
    isForecasting,
    forecastData,
    isPredicting,
    handleCurveSelect,
    filteredWindows,
    refetchForecast: fetchForecast
  };
}
