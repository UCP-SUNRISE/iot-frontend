import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
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

interface EnvironmentalChartProps {
  forecastData: { environmental_forecast?: any[] } | null;
  isForecasting: boolean;
  onRefresh: () => void;
}

export function EnvironmentalChart({ forecastData, isForecasting, onRefresh }: EnvironmentalChartProps) {
  return (
    <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border relative mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Environmental Forecast</h2>
        <button 
          onClick={onRefresh}
          disabled={isForecasting}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh Forecast Data"
        >
          <RefreshCw className={`w-5 h-5 ${isForecasting ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {isForecasting && (
        <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-border">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-foreground font-medium">Loading environmental forecast...</p>
        </div>
      )}
      
      <div className="w-full h-[300px]">
        {forecastData?.environmental_forecast && forecastData.environmental_forecast.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData.environmental_forecast} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="var(--muted-foreground)" 
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
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)', 
                  backgroundColor: 'var(--card)',
                  color: 'var(--card-foreground)',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' 
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              
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
                stroke="var(--muted-foreground)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line 
                yAxisId="temp"
                type="monotone" 
                dataKey="humidity" 
                name="Humidity"
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 text-muted-foreground">
            <svg className="w-10 h-10 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-medium text-foreground">No environmental data</p>
            <p className="text-sm mt-1 text-muted-foreground">Select a date to fetch the forecast</p>
          </div>
        )}
      </div>
    </div>
  );
}
