import React from 'react';

interface SimulationControlsProps {
  minStartTime: string;
  setMinStartTime: (time: string) => void;
}

export function SimulationControls({ minStartTime, setMinStartTime }: SimulationControlsProps) {
  return (
    <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Simulation Controls
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Minimum Start Time (e.g., 11:00)</label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={minStartTime}
              onChange={(e) => setMinStartTime(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
