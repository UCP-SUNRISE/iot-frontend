"use client";

import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LiveLogs() {
  const { eventLogs } = useMqtt();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 pt-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Event Log
          </CardTitle>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {eventLogs.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-0 min-h-[200px] max-h-[300px]">
        {eventLogs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No events yet. Start an experiment to see real-time logs.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {eventLogs.map((log, i) => (
              <li
                key={i}
                className="flex items-start gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
              >
                {/* Coloured dot */}
                <span
                  className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${
                    log.type === "alert" ? "bg-red-500" : "bg-sky-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-snug break-words">
                    {log.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {log.time.toLocaleTimeString([], { hour12: false })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
