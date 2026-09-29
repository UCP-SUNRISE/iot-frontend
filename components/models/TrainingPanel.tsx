"use client";

import { Lightbulb, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Recommendation } from "@/lib/modelRecommendations";
import { TrainingJob } from "@/types/models";
import { SessionRow, TrainingModel } from "@/types/session";

export function TrainingPanel({ model, job, isTraining, isStarting, isConnected, sessions, includeBaseline, recommendations, onTrain, onActivateRecommended }: {
  model: TrainingModel;
  job?: TrainingJob;
  isTraining: boolean;
  isStarting: boolean;
  isConnected: boolean;
  sessions: SessionRow[];
  includeBaseline: boolean;
  recommendations: Recommendation[];
  onTrain: () => void;
  onActivateRecommended: (rec: Extract<Recommendation, { kind: "activate" }>) => void;
}) {
  const eligible = sessions.filter(s => s.training_eligibility[model].eligible).length;
  const blocked = sessions.filter(s => !s.is_active && !s.training_eligibility[model].eligible).length;
  const canTrain = isConnected && !isTraining && !isStarting && (eligible > 0 || includeBaseline);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Training</CardTitle>
          <CardDescription>
            {eligible} eligible session(s){includeBaseline ? " + historical datasets" : ""}.
            {blocked > 0 && ` ${blocked} finished session(s) are not eligible yet — see History.`}
            {" "}Every candidate is validated by holding out one experiment at a time.
          </CardDescription>
        </div>
        <Button onClick={onTrain} disabled={!canTrain} className="shrink-0">
          {isStarting || isTraining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isTraining ? "Training…" : "Train new model"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {job && (job.status === "queued" || job.status === "running") && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{job.message}</span>
              <span className="tabular-nums">{Math.round(job.progress * 100)}%</span>
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
