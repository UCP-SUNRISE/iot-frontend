import React from 'react';
import { Loader2 } from 'lucide-react';

interface PredictionResultProps {
  predictedHardness: { hardness_20m: number; hardness_30m: number; hardness_40m: number } | null;
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
      ) : predictedHardness ? (
        <div className="grid grid-cols-1 gap-4 w-full mt-4">
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground mb-1">20 mins</span>
            <div className="text-2xl font-extrabold text-primary">
              {predictedHardness.hardness_20m.toFixed(2)} <span className="text-base text-muted-foreground font-medium">N</span>
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground mb-1">30 mins</span>
            <div className="text-2xl font-extrabold text-primary">
              {predictedHardness.hardness_30m.toFixed(2)} <span className="text-base text-muted-foreground font-medium">N</span>
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground mb-1">40 mins</span>
            <div className="text-2xl font-extrabold text-primary">
              {predictedHardness.hardness_40m.toFixed(2)} <span className="text-base text-muted-foreground font-medium">N</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
