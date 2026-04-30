"use client";

import { useEffect, useState } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SessionRow {
  session_id: string;
  is_active: number;
  temperature_max: number | null;
  temperature_min: number | null;
  start_time: string | null;
  end_time: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diffMs = e - s;
  if (isNaN(diffMs) || diffMs < 0) return "—";
  const totalSecs = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s2 = totalSecs % 60;
  return [h, m, s2].map(n => String(n).padStart(2, "0")).join(":");
}

export function ExperimentHistory() {
  const { dbQueryResponse, queryDb, isConnected } = useMqtt();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Watch for incoming db/response and hydrate local state
  useEffect(() => {
    if (dbQueryResponse && Array.isArray(dbQueryResponse)) {
      setSessions(dbQueryResponse as SessionRow[]);
      setIsLoading(false);
    }
  }, [dbQueryResponse]);

  // Auto-fetch on mount once connected
  useEffect(() => {
    if (isConnected) {
      setIsLoading(true);
      queryDb("get_sessions");
    }
  }, [isConnected, queryDb]);

  const handleRefresh = () => {
    setIsLoading(true);
    queryDb("get_sessions");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Experiment History</CardTitle>
          <CardDescription>
            Past sessions stored in the Edge Server SQLite registry.
          </CardDescription>
        </div>
        <Button
          id="refresh-history-btn"
          size="sm"
          variant="outline"
          disabled={!isConnected || isLoading}
          onClick={handleRefresh}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {sessions.length === 0 && !isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">
            {isConnected ? "No sessions recorded yet." : "Connecting to broker…"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Max Temp (°C)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell className="font-mono text-xs">
                      {session.session_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={session.is_active ? "default" : "secondary"}
                        className={session.is_active ? "bg-green-600 text-white" : ""}
                      >
                        {session.is_active ? "Active" : "Completed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {formatDateTime(session.start_time)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {session.is_active ? (
                        <span className="text-muted-foreground italic">Running…</span>
                      ) : (
                        formatDateTime(session.end_time)
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatDuration(session.start_time, session.end_time)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {session.temperature_max ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
