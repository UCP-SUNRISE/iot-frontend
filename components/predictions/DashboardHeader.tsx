import React from 'react';

interface DashboardHeaderProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export function DashboardHeader({ selectedDate, setSelectedDate }: DashboardHeaderProps) {
  return (
    <div className="bg-card text-card-foreground shadow-sm rounded-lg p-6 border border-border mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kinetics Model Hub</h1>
          <p className="text-muted-foreground mt-2">Manage ML models and run environmental forecasts over MQTT.</p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-auto px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
