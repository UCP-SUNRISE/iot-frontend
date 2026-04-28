"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoreReadingsProps {
  waterTemp: number;
  foodTemp: number;
}

export function CoreReadings({ waterTemp, foodTemp }: CoreReadingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Water Temperature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-extrabold tracking-tighter">
            {waterTemp.toFixed(1)}
            <span className="text-2xl font-medium text-muted-foreground ml-1">°C</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Food Temperature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-extrabold tracking-tighter text-orange-500">
            {foodTemp.toFixed(1)}
            <span className="text-2xl font-medium text-muted-foreground ml-1">°C</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
