import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PredictionCurvesChartProps {
  filteredWindows: any[];
  isForecasting: boolean;
  hoveredCurveId: string | null;
  setHoveredCurveId: (id: string | null) => void;
  selectedCurveId: string | null;
  handleCurveSelect: (curve: any) => void;
}

export function PredictionCurvesChart({
  filteredWindows,
  isForecasting,
  hoveredCurveId,
  setHoveredCurveId,
  selectedCurveId,
  handleCurveSelect
}: PredictionCurvesChartProps) {
  return (
    <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border flex flex-col flex-grow relative h-full min-h-[400px]">
      <h2 className="text-xl font-bold mb-6">Predicted Water Temperature Curves</h2>
      
      <div className="flex-grow relative h-[400px]">
        {isForecasting && (
          <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-border">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-foreground font-medium">Crunching simulation data...</p>
          </div>
        )}

        {(!filteredWindows || filteredWindows.length === 0) && !isForecasting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 text-muted-foreground">
            <p className="font-medium text-foreground">No prediction curves matching criteria</p>
            <p className="text-sm mt-1 text-muted-foreground">Try adjusting your filters or date</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="var(--muted-foreground)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
                allowDuplicatedCategory={false}
              />
              <YAxis 
                domain={['auto', 'auto']}
                stroke="#ef4444" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}°C`}
                dx={-10}
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

              {filteredWindows.map((curve: any, index: number) => {
                const curveData = curve.water_temp_curve || curve.data || [];
                const dKey = curve.dataKey || "predicted_water_temp";
                return (
                  <Line 
                    key={curve.id || index}
                    data={curveData}
                    type="monotone" 
                    dataKey={dKey}
                    name={curve.name || `Window ${curve.id || index}`}
                    stroke={selectedCurveId === curve.id ? "#ef4444" : "#f87171"} 
                    strokeWidth={selectedCurveId === curve.id ? 3 : 2}
                    strokeOpacity={hoveredCurveId !== null && hoveredCurveId !== curve.id ? 0.2 : 1}
                    dot={false}
                    activeDot={{ r: 6 }}
                    onMouseEnter={() => setHoveredCurveId(curve.id)}
                    onMouseLeave={() => setHoveredCurveId(null)}
                    onClick={() => handleCurveSelect(curve)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
