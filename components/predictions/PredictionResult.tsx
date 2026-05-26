import React from 'react';
import { Loader2 } from 'lucide-react';

interface PredictionResultProps {
  predictedHardness: number | null;
  isPredicting: boolean;
}

export function PredictionResult({ predictedHardness, isPredicting }: PredictionResultProps) {
  if (predictedHardness === null && !isPredicting) {
    return null;
  }

  return (
    <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border flex flex-col items-center justify-center mt-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold">Predicted Hardness</h3>
        <p className="text-muted-foreground text-sm">Based on selected curve</p>
      </div>
      {isPredicting ? (
        <Loader2 className="w-8 h-8 text-primary animate-spin my-4" />
      ) : (
        <div className="text-4xl font-extrabold text-primary">
          {typeof predictedHardness === 'number' ? predictedHardness.toFixed(2) : predictedHardness} <span className="text-xl text-muted-foreground font-medium">mg/L</span>
        </div>
      )}
    </div>
  );
}
