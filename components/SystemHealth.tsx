"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemHealthProps {
  isConnected: boolean;
  deviceId: string;
}

export function SystemHealth({ isConnected, deviceId }: SystemHealthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">
            Edge Server: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold mb-2">Active Device</h4>
          <div className="flex flex-wrap gap-2">
            {deviceId ? (
              <Badge variant="secondary">
                {deviceId}: Online
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">No device data.</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
