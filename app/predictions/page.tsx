"use client";

import React, { useState } from 'react';
import { useMqtt } from '@/contexts/MqttContext';
import { SessionReviewCard } from '../../components/predictions/SessionReviewCard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function PredictionsDashboard() {
  const { makeRpcCall } = useMqtt();

  // Training state
  const [isRetraining, setIsRetraining] = useState(false);
  const [metrics, setMetrics] = useState<{ r2?: number; mae?: number; rmse?: number } | null>(null);

  // Forecast state
  const [targetHardness, setTargetHardness] = useState('');
  const [proposedStartTime, setProposedStartTime] = useState('');
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastData, setForecastData] = useState<Record<string, unknown>[] | null>(null);

  const handleRetrain = async () => {
    try {
      setIsRetraining(true);
      setMetrics(null);
      const response = await makeRpcCall<Record<string, unknown>>(
        'sunrise/ml/train/request',
        'sunrise/ml/train/response',
        {}
      );
      // Assuming response has metrics directly or in response.data/response.metrics
      const resultMetrics = (response.metrics || response.data || response) as { r2?: number; mae?: number; rmse?: number };
      setMetrics(resultMetrics);
      toast.success('Kinetics Model retrained successfully');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to retrain model');
    } finally {
      setIsRetraining(false);
    }
  };

  const handleForecast = async () => {
    if (!targetHardness || !proposedStartTime) {
      toast.error('Please fill in both Target Hardness and Proposed Start Time');
      return;
    }
    
    try {
      setIsForecasting(true);
      const response = await makeRpcCall<Record<string, unknown> | Record<string, unknown>[]>(
        'sunrise/ml/predict/request',
        'sunrise/ml/predict/response',
        {
          target_hardness: parseFloat(targetHardness),
          start_time: proposedStartTime
        }
      );
      
      const data = Array.isArray(response) ? response : (response.data as Record<string, unknown>[] || []);
      setForecastData(data);
      toast.success('Forecast generated successfully');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to run forecast');
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kinetics Model Hub</h1>
              <p className="text-slate-500 mt-2">Manage ML models and run environmental forecasts over MQTT.</p>
            </div>
            <button
              onClick={handleRetrain}
              disabled={isRetraining}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 min-w-[220px]"
            >
              {isRetraining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Retraining Model...
                </>
              ) : (
                'Retrain Kinetics Model'
              )}
            </button>
          </div>

          {/* Metrics Display */}
          {metrics && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex flex-col items-center shadow-sm">
                <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">R² Score</span>
                <span className="text-3xl font-extrabold text-indigo-900 mt-2">{metrics.r2 !== undefined ? metrics.r2.toFixed(4) : 'N/A'}</span>
              </div>
              <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 flex flex-col items-center shadow-sm">
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Mean Absolute Error (MAE)</span>
                <span className="text-3xl font-extrabold text-emerald-900 mt-2">{metrics.mae !== undefined ? `${metrics.mae.toFixed(2)}°C` : 'N/A'}</span>
              </div>
              <div className="bg-sky-50 rounded-xl p-6 border border-sky-100 flex flex-col items-center shadow-sm">
                <span className="text-sm font-bold text-sky-600 uppercase tracking-wider">Root Mean Squared Error (RMSE)</span>
                <span className="text-3xl font-extrabold text-sky-900 mt-2">{metrics.rmse !== undefined ? `${metrics.rmse.toFixed(2)}°C` : 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Forecast Simulator
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Hardness (mg/L)</label>
                  <input
                    type="number"
                    value={targetHardness}
                    onChange={(e) => setTargetHardness(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Proposed Start Time</label>
                  <input
                    type="datetime-local"
                    value={proposedStartTime}
                    onChange={(e) => setProposedStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={handleForecast}
                  disabled={isForecasting}
                  className="w-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 text-white font-medium py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50 mt-2"
                >
                  {isForecasting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Running Forecast...
                    </>
                  ) : (
                    'Run Forecast'
                  )}
                </button>
              </div>
            </div>

            {/* Quarantine Review Card */}
            <div>
               <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Data Quarantine UI</h3>
               <SessionReviewCard sessionId="SESSION_LATEST" />
            </div>
          </div>

          {/* Chart Column */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Prediction Results</h2>
            
            <div className="flex-grow relative min-h-[550px] bg-white">
              {isForecasting && (
                <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border border-slate-100">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <p className="text-indigo-900 font-medium">Crunching environmental data from Open-Meteo...</p>
                </div>
              )}

              {!forecastData && !isForecasting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-slate-100">
                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="font-medium text-slate-600">No predictions yet</p>
                  <p className="text-sm mt-1">Run a forecast to view the prediction curves</p>
                </div>
              )}

              {forecastData && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#94a3b8" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="temp"
                      domain={['auto', 'auto']}
                      stroke="#ef4444" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}°C`}
                      dx={-10}
                    />
                    <YAxis 
                      yAxisId="solar"
                      orientation="right"
                      domain={['auto', 'auto']}
                      stroke="#eab308" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val} W/m²`}
                      dx={10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {/* Environmental Open-Meteo Curve */}
                    <Area 
                      yAxisId="solar"
                      type="monotone" 
                      dataKey="solar_radiation" 
                      name="Solar Radiation"
                      fill="#fef08a" 
                      stroke="#eab308" 
                      fillOpacity={0.2}
                    />
                    
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="ambient_temp" 
                      name="Ambient Temp"
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />

                    {/* Predicted Output */}
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="predicted_water_temp" 
                      name="Predicted Water Temp"
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
