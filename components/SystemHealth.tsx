"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceRecord } from "@/types/telemetry";

interface SystemHealthProps {
  isConnected: boolean;
  registeredDevices: DeviceRecord[];
}

export function SystemHealth({ isConnected, registeredDevices }: SystemHealthProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Edge Server WebSocket connection status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">
            Edge Server: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Device registry — source of truth from the Edge Server SQLite DB */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Registered Devices</h4>
          {registeredDevices.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Waiting for registry...' : 'No data — not connected.'}
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              {registeredDevices.map((device) => {
                const isOnline = device.last_status === 'online';
                return (
                  <div key={device.device_id} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{device.device_id}</span>
                    <Badge variant={isOnline ? 'default' : 'secondary'}
                      className={isOnline ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
