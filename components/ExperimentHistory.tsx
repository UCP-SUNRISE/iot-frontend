"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useMqtt } from "@/contexts/MqttContext";
import { useConfirm } from "@/contexts/ConfirmDialogContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, CircleDashed, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExperimentDetailsDialog } from "./ExperimentDetailsDialog";
import { HardnessDialog } from "./history/HardnessDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionRow, SessionTrainingChanges, TrainingModel } from "@/types/session";
import { parseDbTimestamp } from "@/lib/time";
import { isSessionList } from "@/lib/sessions";
import { cn } from "@/lib/utils";

const MODEL_LABELS: Record<TrainingModel, string> = {
  kinetics: "Kinetics",
  hardness: "Hardness",
};

function formatDateTime(value: string | null): string {
  const date = parseDbTimestamp(value);
  return date ? date.toLocaleString([], { dateStyle: "short", timeStyle: "medium" }) : "—";
}

function formatDuration(start: string | null, end: string | null): string {
  const s = parseDbTimestamp(start)?.getTime();
  if (s == null) return "—";
  const e = parseDbTimestamp(end)?.getTime() ?? Date.now();
  const diffMs = e - s;
  if (isNaN(diffMs) || diffMs < 0) return "—";
  const totalSecs = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s2 = totalSecs % 60;
  return [h, m, s2].map(n => String(n).padStart(2, "0")).join(":");
}

function EligibilityBadge({ model, session }: { model: TrainingModel; session: SessionRow }) {
  const { eligible, reasons } = session.training_eligibility[model];
  const tooltip = eligible
    ? `Eligible for ${MODEL_LABELS[model].toLowerCase()} model training`
    : `Not eligible for ${MODEL_LABELS[model].toLowerCase()} training:\n• ${reasons.join("\n• ")}`;
  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        eligible ? "text-green-500" : "text-muted-foreground"
      )}
    >
      {eligible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
      {MODEL_LABELS[model]}
      <span className="sr-only">{eligible ? "eligible" : `not eligible: ${reasons.join("; ")}`}</span>
    </span>
  );
}

export function ExperimentHistory() {
  const { dbQueryResponse, queryDb, isConnected, systemSettings } = useMqtt();
  const { user } = useUser();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [hardnessSession, setHardnessSession] = useState<SessionRow | null>(null);

  const hardnessUnit = systemSettings?.training.hardness_unit ?? "N";

  // Watch for incoming db/response and hydrate local state
  useEffect(() => {
    if (dbQueryResponse && Array.isArray(dbQueryResponse) && isSessionList(dbQueryResponse)) {
      setSessions(dbQueryResponse);
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

  const pendingHardness = useMemo(
    () => sessions.filter(s => !s.is_active && s.final_hardness == null).length,
    [sessions]
  );

  const handleRefresh = () => {
    setIsLoading(true);
    queryDb("get_sessions");
  };

  const handleViewDetails = (sessionId: string) => {
    setSelectedSession(sessionId);
  };

  const handleExport = (sessionId: string) => {
    setSelectedSession(sessionId);
    toast.info("Opening Export View", { description: "Use the 'Export XLSX' button inside the details panel." });
  };

  const handleDelete = (sessionId: string) => {
    confirm({
      title: "Delete Experiment",
      description: `Are you absolutely sure you want to delete experiment ${sessionId}? This will erase all telemetry permanently.`,
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: () => {
        queryDb("delete_session", { session_id: sessionId });
        toast.loading(`Deleting ${sessionId}...`, { id: `delete-${sessionId}` });
      }
    });
  };

  const updateTraining = (sessionId: string, changes: SessionTrainingChanges) => {
    toast.loading("Saving...", { id: `training-${sessionId}` });
    queryDb("update_session_training", {
      session_id: sessionId,
      user: user?.name ?? user?.email ?? null,
      changes,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Experiment History</CardTitle>
          <CardDescription>
            Past sessions stored in the Edge Server SQLite registry.
            {pendingHardness > 0 && (
              <span className="text-amber-500"> {pendingHardness} session(s) awaiting final hardness.</span>
            )}
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
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Max Water (°C)</TableHead>
                  <TableHead>Final Hardness</TableHead>
                  <TableHead>Use for Training</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell>
                      <div className="font-mono text-xs">{session.session_id}</div>
                      {session.experiment_name && (
                        <div className="text-xs text-muted-foreground">{session.experiment_name}</div>
                      )}
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
                    <TableCell className="font-mono text-xs tabular-nums">
                      {formatDuration(session.start_time, session.end_time)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {session.temperature_max != null ? session.temperature_max.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>
                      {session.is_active ? (
                        <span className="text-xs text-muted-foreground italic">After session</span>
                      ) : session.final_hardness != null ? (
                        <button
                          className="group inline-flex items-center gap-1.5 text-sm tabular-nums hover:text-primary"
                          onClick={() => setHardnessSession(session)}
                          title={[
                            session.raw_hardness != null ? `Raw: ${session.raw_hardness} ${hardnessUnit}` : "Raw hardness not recorded",
                            session.hardness_notes,
                          ].filter(Boolean).join("\n")}
                        >
                          {session.final_hardness} {hardnessUnit}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-amber-500/50 text-amber-500 hover:text-amber-500"
                          onClick={() => setHardnessSession(session)}
                        >
                          Add value
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!!session.is_approved}
                          disabled={!!session.is_active || !isConnected}
                          onCheckedChange={checked => updateTraining(session.session_id, { is_approved: checked })}
                          aria-label={`Use ${session.session_id} for training`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <EligibilityBadge model="kinetics" session={session} />
                          <EligibilityBadge model="hardness" session={session} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(session.session_id)}>
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!!session.is_active}
                            onClick={() => setHardnessSession(session)}
                          >
                            {session.final_hardness != null ? "Edit final hardness" : "Add final hardness"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(session.session_id)}>
                            Export data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(session.session_id)}
                          >
                            Delete experiment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ExperimentDetailsDialog
        sessionId={selectedSession}
        isOpen={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      />
      <HardnessDialog
        session={hardnessSession}
        unit={hardnessUnit}
        onOpenChange={(open) => !open && setHardnessSession(null)}
        onSave={updateTraining}
      />
    </Card>
  );
}
