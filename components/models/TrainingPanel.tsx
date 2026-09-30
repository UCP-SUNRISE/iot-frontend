"use client";

import { Lightbulb, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Recommendation } from "@/lib/modelRecommendations";
import { TrainingJob } from "@/types/models";
import { formatDuration } from "./format";

export function TrainingPanel({ job, isTraining, isStarting, isConnected, eligibleSessions, blockedSessions, includeBaseline, recommendations, onTrain, onCancel, onActivateRecommended }: {
  job?: TrainingJob;
  isTraining: boolean;
  isStarting: boolean;
  isConnected: boolean;
  eligibleSessions: number;
  /** Finished sessions that do not pass the eligibility rules yet. */
  blockedSessions: number;
  includeBaseline: boolean;
  recommendations: Recommendation[];
  /** Opens the train dialog. */
  onTrain: () => void;
  onCancel: () => void;
  onActivateRecommended: (rec: Extract<Recommendation, { kind: "activate" }>) => void;
}) {
  const canTrain = isConnected && !isTraining && !isStarting && (eligibleSessions > 0 || includeBaseline);
  const isCancelling = job?.message === "Cancelling…";

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Training</CardTitle>
          <CardDescription>
            {eligibleSessions} eligible session(s){includeBaseline ? " + historical datasets" : ""}.
            {blockedSessions > 0 && ` ${blockedSessions} finished session(s) are not eligible yet — see History.`}
            {" "}Every candidate is validated by holding out one experiment at a time.
          </CardDescription>
        </div>
        <Button onClick={onTrain} disabled={!canTrain} className="shrink-0">
          {isStarting || isTraining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isTraining ? "Training…" : "Train new model"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {job && isTraining && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="truncate">{job.message}</span>
              <span className="flex items-center gap-3 shrink-0 tabular-nums">
                {job.elapsed_seconds != null && <span>{formatDuration(job.elapsed_seconds)} elapsed</span>}
                {job.eta_seconds != null && <span>about {formatDuration(job.eta_seconds)} left</span>}
                <span>{Math.round(job.progress * 100)}%</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive" onClick={onCancel} disabled={isCancelling}>
                  Cancel
                </Button>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${job.progress * 100}%` }} />
            </div>
          </div>
        )}
        {job?.status === "failed" && (
          <p className="text-sm text-destructive">Last training failed: {job.error ?? "unknown error"}</p>
        )}

        {recommendations.length > 0 ? (
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  {rec.message}
                </span>
                {rec.kind === "activate" ? (
                  <Button size="sm" variant="outline" onClick={() => onActivateRecommended(rec)}>
                    Activate {rec.entry.name}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onTrain} disabled={!canTrain}>Train now</Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendations — the active model is up to date.</p>
        )}
      </CardContent>
    </Card>
  );
}
